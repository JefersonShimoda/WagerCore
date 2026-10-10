import { OutboxMessage, OutboxStatus } from '../../../domain/messaging/outbox-message.js';
import { OutboxMessageEntity } from '../mikroorm/entities/outbox-message.entity.js';

export class OutboxMessageMapper {
  static toDomain(entity: OutboxMessageEntity): OutboxMessage {
    return OutboxMessage.rehydrate({
      id: entity.id,
      eventId: entity.eventId,
      aggregateId: entity.aggregateId,
      eventType: entity.eventType,
      version: entity.version,
      correlationId: entity.correlationId,
      causationId: entity.causationId,
      payload: entity.payload,
      occurredAt: entity.occurredAt,
      attempts: entity.attempts,
      nextAttemptAt: entity.nextAttemptAt,
      leaseUntil: entity.leaseUntil,
      status: entity.status as OutboxStatus,
      publishedAt: entity.publishedAt,
      lastError: entity.lastError,
    });
  }

  static toEntity(domain: OutboxMessage): any {
    return {
      id: domain.id,
      eventId: domain.eventId,
      aggregateId: domain.aggregateId,
      eventType: domain.eventType,
      version: domain.version,
      correlationId: domain.correlationId,
      causationId: domain.causationId,
      payload: domain.payload,
      occurredAt: domain.occurredAt,
      attempts: domain.attempts,
      nextAttemptAt: domain.nextAttemptAt,
      leaseUntil: domain.leaseUntil,
      status: domain.status,
      publishedAt: domain.publishedAt,
      lastError: domain.lastError,
    };
  }
}
