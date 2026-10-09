import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'outbox_messages' })
export class OutboxMessageEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'uuid', fieldName: 'event_id' })
  eventId!: string;

  @Property({ type: 'uuid', fieldName: 'aggregate_id' })
  aggregateId!: string;

  @Property({ type: 'string', length: 100, fieldName: 'event_type' })
  eventType!: string;

  @Property({ type: 'integer' })
  version!: number;

  @Property({ type: 'string', length: 100, fieldName: 'correlation_id' })
  correlationId!: string;

  @Property({ type: 'string', length: 100, nullable: true, fieldName: 'causation_id' })
  causationId?: string;

  @Property({ type: 'jsonb' })
  payload!: any;

  @Property({ type: 'timestamptz', fieldName: 'occurred_at' })
  occurredAt!: Date;

  @Property({ type: 'integer', default: 0 })
  attempts!: number;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'next_attempt_at' })
  nextAttemptAt?: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'lease_until' })
  leaseUntil?: Date;

  @Property({ type: 'string', length: 20 })
  status!: string;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'published_at' })
  publishedAt?: Date;

  @Property({ type: 'text', nullable: true, fieldName: 'last_error' })
  lastError?: string;
}
