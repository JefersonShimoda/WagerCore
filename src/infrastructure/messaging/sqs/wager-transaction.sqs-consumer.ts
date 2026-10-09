import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, ChangeMessageVisibilityCommand, Message } from '@aws-sdk/client-sqs';
import { SqsService } from './sqs.service.js';
import { ProcessWagerTransactionUseCase } from '../../../application/use-cases/process-wager-transaction.use-case.js';
import { SQS_CLIENT } from './sqs.constants.js';
import { CanonicalPayloadHasher } from '../../hashing/canonical-payload-hasher.js';
import { ConflictError } from '../../../application/errors/conflict.error.js';
import { Logger } from 'nestjs-pino';
import { MetricsService } from '../../../observability/metrics.service.js';

@Injectable()
export class WagerTransactionSqsConsumer implements OnModuleInit, OnModuleDestroy {
  private isRunning = false;
  private queueUrl: string | null = null;
  private readonly consumerName = 'wager-core-transactions';
  private activePromises = new Set<Promise<void>>();

  constructor(
    @Inject(SQS_CLIENT)
    private readonly sqsClient: SQSClient,
    private readonly sqsService: SqsService,
    private readonly processWagerTxnUseCase: ProcessWagerTransactionUseCase,
    private readonly logger: Logger,
    private readonly metrics: MetricsService,
  ) {}

  async onModuleInit() {
    this.queueUrl = await this.sqsService.getTransactionsQueueUrl();
    this.isRunning = true;
    void this.poll();
  }

  async onModuleDestroy() {
    this.logger.log('SIGTERM received. Shutting down SQS consumer...');
    this.isRunning = false;
    
    if (this.activePromises.size > 0) {
      this.logger.log(`Waiting for ${this.activePromises.size} messages to complete...`);
      await Promise.allSettled(Array.from(this.activePromises));
    }
  }

  private async poll() {
    while (this.isRunning) {
      try {
        const response = await this.sqsClient.send(
          new ReceiveMessageCommand({
            QueueUrl: this.queueUrl!,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20,
          }),
        );

        if (response.Messages && response.Messages.length > 0) {
          for (const message of response.Messages) {
            if (!this.isRunning) {
              await this.returnVisibility(message);
              continue;
            }

            const promise = this.handleMessage(message).finally(() => {
              this.activePromises.delete(promise);
            });
            this.activePromises.add(promise);
          }
        }
      } catch (error) {
        if (this.isRunning) {
          this.logger.error('Error polling SQS', error);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
  }

  private async returnVisibility(message: Message) {
    try {
      await this.sqsClient.send(
        new ChangeMessageVisibilityCommand({
          QueueUrl: this.queueUrl!,
          ReceiptHandle: message.ReceiptHandle!,
          VisibilityTimeout: 0,
        }),
      );
    } catch (err) {
      this.logger.error(`Failed to return visibility for message ${message.MessageId}`, err);
    }
  }

  private async handleMessage(message: Message) {
    const start = process.hrtime();
    let logCtx: any = { messageId: message.MessageId };
    
    try {
      if (!message.Body) throw new Error('Message body is empty');
      
      const payload = JSON.parse(message.Body);
      const data = payload.data || payload;
      const messageId = payload.messageId || message.MessageId;
      
      logCtx = {
        correlationId: messageId,
        messageId: messageId,
        transactionId: data.externalTransactionId,
        walletId: data.walletId,
        providerId: data.providerId,
      };

      this.logger.log(logCtx, `Received SQS message ${data.kind}`);
      
      const hasher = new CanonicalPayloadHasher();
      const payloadHash = hasher.hash(data);

      const txn = await this.processWagerTxnUseCase.execute({
        providerId: data.providerId,
        externalTransactionId: data.externalTransactionId,
        idempotencyKey: data.idempotencyKey || data.externalTransactionId,
        payloadHash: payloadHash,
        walletId: data.walletId,
        playerId: data.playerId,
        roundId: data.roundId,
        gameId: data.gameId,
        kind: data.kind,
        money: data.money,
        referenceExternalTransactionId: data.referenceExternalTransactionId,
        inboxMessage: {
          consumerName: this.consumerName,
          messageId: messageId,
        }
      });

      this.metrics.transactionsTotal.inc({ status: txn.status, kind: txn.kind });

      await this.sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: this.queueUrl!,
          ReceiptHandle: message.ReceiptHandle!,
        }),
      );
      
      this.logger.log(logCtx, `Successfully processed and ACKed message ${messageId}`);
    } catch (error: any) {
      this.logger.error(logCtx, `Failed to process message ${logCtx.messageId}: ${error.message}`);
      
      if (error instanceof SyntaxError) {
        this.metrics.dlqMessagesTotal.inc();
      } else if (error instanceof ConflictError && error.code === 'EXTERNAL_TRANSACTION_CONFLICT') {
        this.metrics.dlqMessagesTotal.inc();
      } else if (error.message && error.message.includes('deadlock') || error.message.includes('Lock wait timeout')) {
        this.metrics.lockConflictsTotal.inc();
        this.metrics.retriesTotal.inc();
      } else {
        this.metrics.retriesTotal.inc();
      }
    } finally {
      const end = process.hrtime(start);
      this.metrics.processingLatency.observe(end[0] + end[1] / 1e9);
    }
  }
}

