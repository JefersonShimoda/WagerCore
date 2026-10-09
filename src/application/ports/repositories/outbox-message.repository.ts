import { OutboxMessage } from '../../../domain/messaging/outbox-message.js';

export abstract class OutboxMessageRepository {
  abstract save(message: OutboxMessage): Promise<void>;
  abstract saveAll(messages: OutboxMessage[]): Promise<void>;
  abstract findPendingForUpdateAndLease(limit: number, leaseUntil: Date, now: Date): Promise<OutboxMessage[]>;
}
