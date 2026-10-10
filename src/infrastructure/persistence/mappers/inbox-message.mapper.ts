import { InboxMessage } from '../../../domain/messaging/inbox-message.js';
import { InboxMessageEntity } from '../mikroorm/entities/inbox-message.entity.js';

export class InboxMessageMapper {
  static toDomain(entity: InboxMessageEntity): InboxMessage {
    return InboxMessage.rehydrate({
      consumerName: entity.consumerName,
      messageId: entity.messageId,
      payloadHash: entity.payloadHash,
      receivedAt: entity.receivedAt,
      processedAt: entity.processedAt,
    });
  }

  static toEntity(domain: InboxMessage): any {
    return {
      consumerName: domain.consumerName,
      messageId: domain.messageId,
      payloadHash: domain.payloadHash,
      receivedAt: domain.receivedAt,
      processedAt: domain.processedAt,
    };
  }
}
