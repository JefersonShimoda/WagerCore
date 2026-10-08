import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SQSClient } from '@aws-sdk/client-sqs';

import { SQS_CLIENT } from './sqs.constants.js';
import { SqsService } from './sqs.service.js';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SQS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const endpoint = configService.get<string>('AWS_ENDPOINT_URL');

        return new SQSClient({
          region: configService.getOrThrow<string>('AWS_REGION'),
          endpoint: endpoint || undefined,
          credentials: endpoint
            ? {
                accessKeyId: configService.getOrThrow<string>(
                  'AWS_ACCESS_KEY_ID',
                ),
                secretAccessKey: configService.getOrThrow<string>(
                  'AWS_SECRET_ACCESS_KEY',
                ),
              }
            : undefined,
        });
      },
    },
    SqsService,
  ],
  exports: [SqsService],
})
export class SqsModule {}