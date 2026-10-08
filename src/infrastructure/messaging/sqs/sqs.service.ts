import { GetQueueUrlCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SQS_CLIENT } from './sqs.constants.js';

@Injectable()
export class SqsService {
  constructor(
    @Inject(SQS_CLIENT)
    private readonly client: SQSClient,
    private readonly configService: ConfigService,
  ) {}

  async getTransactionsQueueUrl(): Promise<string> {
    const queueName = this.configService.getOrThrow<string>(
      'SQS_TRANSACTIONS_QUEUE',
    );

    const response = await this.client.send(
      new GetQueueUrlCommand({
        QueueName: queueName,
      }),
    );

    if (!response.QueueUrl) {
      throw new Error(`Queue URL not found: ${queueName}`);
    }

    return response.QueueUrl;
  }
}