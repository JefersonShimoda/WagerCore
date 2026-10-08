import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { SqsModule } from '../infrastructure/messaging/sqs/sqs.module.js';

import { DatabaseHealthIndicator } from './database.health.js';
import { HealthController } from './health.controller.js';
import { SqsHealthIndicator } from './sqs.health.js';

@Module({
  imports: [TerminusModule, SqsModule],
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator, SqsHealthIndicator],
})
export class HealthModule {}
