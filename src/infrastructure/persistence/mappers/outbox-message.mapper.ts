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

  static toEntity(domain: OutboxMessage): OutboxMessageEntity {
    const entity = new OutboxMessageEntity();
    entity.id = domain.id;
    entity.eventId = domain.eventId;
    entity.aggregateId = domain.aggregateId;
    entity.eventType = domain.eventType;
    entity.version = domain.version;
    entity.correlationId = domain.correlationId;
    entity.causationId = domain.causationId;
    entity.payload = domain.payload;
    entity.occurredAt = domain.occurredAt;
    entity.attempts = domain.attempts;
    entity.nextAttemptAt = domain.nextAttemptAt;
    entity.leaseUntil = domain.leaseUntil;
    entity.status = domain.status;
    entity.publishedAt = domain.publishedAt;
    entity.lastError = domain.lastError;
    return entity;
  }
}
