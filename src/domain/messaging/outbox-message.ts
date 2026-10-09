import { v7 as uuidv7 } from 'uuid';
import { DomainError } from '../shared/errors/domain.error.js';

export type OutboxStatus = 'PENDING' | 'PROCESSING' | 'PUBLISHED';

export interface OutboxMessageProps {
  id: string;
  eventId: string;
  aggregateId: string;
  eventType: string;
  version: number;
  correlationId: string;
  causationId?: string;
  payload: any;
  occurredAt: Date;
  attempts: number;
  nextAttemptAt?: Date;
  leaseUntil?: Date;
  status: OutboxStatus;
  publishedAt?: Date;
  lastError?: string;
}

export class OutboxMessage {
  private constructor(private readonly props: OutboxMessageProps) {}

  get id(): string { return this.props.id; }
  get eventId(): string { return this.props.eventId; }
  get aggregateId(): string { return this.props.aggregateId; }
  get eventType(): string { return this.props.eventType; }
  get version(): number { return this.props.version; }
  get correlationId(): string { return this.props.correlationId; }
  get causationId(): string | undefined { return this.props.causationId; }
  get payload(): any { return this.props.payload; }
  get occurredAt(): Date { return this.props.occurredAt; }
  get attempts(): number { return this.props.attempts; }
  get nextAttemptAt(): Date | undefined { return this.props.nextAttemptAt; }
  get leaseUntil(): Date | undefined { return this.props.leaseUntil; }
  get status(): OutboxStatus { return this.props.status; }
  get publishedAt(): Date | undefined { return this.props.publishedAt; }
  get lastError(): string | undefined { return this.props.lastError; }

  static create(
    aggregateId: string,
    eventType: string,
    version: number,
    correlationId: string,
    payload: any,
    now: Date,
    causationId?: string,
  ): OutboxMessage {
    return new OutboxMessage({
      id: uuidv7(),
      eventId: uuidv7(),
      aggregateId,
      eventType,
      version,
      correlationId,
      causationId,
      payload,
      occurredAt: now,
      attempts: 0,
      status: 'PENDING',
    });
  }

  markProcessing(leaseUntil: Date): void {
    if (this.props.status === 'PUBLISHED') {
      throw new DomainError('Cannot process a published event');
    }
    this.props.status = 'PROCESSING';
    this.props.leaseUntil = leaseUntil;
  }

  markPublished(now: Date): void {
    this.props.status = 'PUBLISHED';
    this.props.publishedAt = now;
    this.props.leaseUntil = undefined;
  }

  markFailed(nextAttemptAt: Date, error: string): void {
    this.props.status = 'PENDING';
    this.props.attempts++;
    this.props.nextAttemptAt = nextAttemptAt;
    this.props.lastError = error;
    this.props.leaseUntil = undefined;
  }

  static rehydrate(props: OutboxMessageProps): OutboxMessage {
    return new OutboxMessage(props);
  }
}
