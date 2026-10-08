import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

import { SqsService } from '../infrastructure/messaging/sqs/sqs.service.js';

@Injectable()
export class SqsHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly sqsService: SqsService,
  ) {}

  isHealthy(key: string) {
    return this.healthIndicatorService
      .check(key)
      .attempt(async () => {
        await this.sqsService.getTransactionsQueueUrl();

        return {
          queue: 'wager-transactions.fifo',
        };
      })
      .withTimeout(1000);
  }
}