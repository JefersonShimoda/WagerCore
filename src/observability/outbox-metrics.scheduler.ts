import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/postgresql';
import { MetricsService } from './metrics.service.js';
import { OutboxMessageEntity } from '../infrastructure/persistence/mikroorm/entities/outbox-message.entity.js';

@Injectable()
export class OutboxMetricsScheduler {
  private readonly logger = new Logger(OutboxMetricsScheduler.name);

  constructor(
    private readonly em: EntityManager,
    private readonly metrics: MetricsService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async recordOutboxLag() {
    try {
      const count = await this.em.count(OutboxMessageEntity, { status: 'PENDING' });
      this.metrics.outboxLag.set(count);
    } catch (error) {
      this.logger.error('Failed to calculate outbox lag', error);
    }
  }
}
