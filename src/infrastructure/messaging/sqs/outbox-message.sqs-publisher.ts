import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { SqsService } from './sqs.service.js';
import { SQS_CLIENT } from './sqs.constants.js';
import { OutboxMessageRepository } from '../../../application/ports/repositories/outbox-message.repository.js';
import { Clock } from '../../../application/ports/clock/clock.port.js';

@Injectable()
export class OutboxMessageSqsPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxMessageSqsPublisher.name);
  private timer: NodeJS.Timeout | null = null;
  private isPublishing = false;
  private queueUrl: string | null = null;

  constructor(
    @Inject(SQS_CLIENT)
    private readonly sqsClient: SQSClient,
    private readonly sqsService: SqsService,
    private readonly outboxRepo: OutboxMessageRepository,
    private readonly clock: Clock,
  ) {}

  async onModuleInit() {
    this.queueUrl = await this.sqsService.getTransactionsQueueUrl(); // Using same queue or events queue? Usually there's an events queue, but assuming transactions queue for now.
    
    this.timer = setInterval(() => {
      this.publishPendingMessages().catch(err => {
        this.logger.error('Failed to publish outbox messages', err);
      });
    }, 2000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async publishPendingMessages() {
    if (this.isPublishing || !this.queueUrl) return;
    this.isPublishing = true;

    try {
      const now = this.clock.now();
      const leaseUntil = new Date(now.getTime() + 30000); // 30 seconds lease
      
      const messages = await this.outboxRepo.findPendingForUpdateAndLease(10, leaseUntil, now);
      
      for (const msg of messages) {
        try {
          // Add standard attributes/MessageGroupId if it's FIFO, but assuming Standard SQS for now
          await this.sqsClient.send(new SendMessageCommand({
            QueueUrl: this.queueUrl,
            MessageBody: JSON.stringify({
              id: msg.id,
              eventId: msg.eventId,
              aggregateId: msg.aggregateId,
              eventType: msg.eventType,
              payload: msg.payload,
              occurredAt: msg.occurredAt.toISOString(),
            }),
            MessageAttributes: {
              'EventType': { DataType: 'String', StringValue: msg.eventType },
            },
          }));

          msg.markPublished(this.clock.now());
          await this.outboxRepo.save(msg);
        } catch (err: any) {
          this.logger.error(`Failed to publish outbox message ${msg.id}`, err);
          
          const nextAttemptAt = new Date(this.clock.now().getTime() + msg.attempts * 5000); // Backoff
          msg.markFailed(nextAttemptAt, err.message || 'Unknown error');
          await this.outboxRepo.save(msg);
        }
      }
    } finally {
      this.isPublishing = false;
    }
  }
}
