import { InboxMessage } from '../../../domain/messaging/inbox-message.js';

export abstract class InboxMessageRepository {
  abstract save(message: InboxMessage): Promise<void>;
  abstract findById(consumerName: string, messageId: string): Promise<InboxMessage | null>;
}
