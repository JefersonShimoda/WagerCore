import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, Message } from '@aws-sdk/client-sqs';
import { SqsService } from './sqs.service.js';
import { ProcessWagerTransactionUseCase } from '../../../application/use-cases/process-wager-transaction.use-case.js';
import { SQS_CLIENT } from './sqs.constants.js';
import { CanonicalPayloadHasher } from '../../hashing/canonical-payload-hasher.js';

@Injectable()
export class WagerTransactionSqsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WagerTransactionSqsConsumer.name);
  private isRunning = false;
  private queueUrl: string | null = null;
  private readonly consumerName = 'wager-core-transactions';

  constructor(
    @Inject(SQS_CLIENT)
    private readonly sqsClient: SQSClient,
    private readonly sqsService: SqsService,
    private readonly processWagerTxnUseCase: ProcessWagerTransactionUseCase,
  ) {}

  async onModuleInit() {
    this.queueUrl = await this.sqsService.getTransactionsQueueUrl();
    this.isRunning = true;
    void this.poll();
  }

  onModuleDestroy() {
    this.isRunning = false;
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
            await this.handleMessage(message);
          }
        }
      } catch (error) {
        this.logger.error('Error polling SQS', error);
        // Delay before retrying to prevent tight loop on error
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async handleMessage(message: Message) {
    try {
      if (!message.Body) throw new Error('Message body is empty');
      
      const payload = JSON.parse(message.Body);
      
      // Calculate payload hash
      const hasher = new CanonicalPayloadHasher();
      const payloadHash = hasher.hash(payload);

      await this.processWagerTxnUseCase.execute({
        providerId: payload.providerId,
        externalTransactionId: payload.externalTransactionId,
        idempotencyKey: payload.idempotencyKey || payload.externalTransactionId,
        payloadHash: payloadHash,
        walletId: payload.walletId,
        playerId: payload.playerId,
        roundId: payload.roundId,
        gameId: payload.gameId,
        kind: payload.kind,
        money: payload.money,
        referenceExternalTransactionId: payload.referenceExternalTransactionId,
        inboxMessage: {
          consumerName: this.consumerName,
          messageId: message.MessageId!,
        }
      });

      // ACK the message
      await this.sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: this.queueUrl!,
          ReceiptHandle: message.ReceiptHandle!,
        }),
      );
    } catch (error: any) {
      this.logger.error(`Failed to process message ${message.MessageId}`, error);
      // We do not delete the message so it goes back to the queue/DLQ
    }
  }
}
