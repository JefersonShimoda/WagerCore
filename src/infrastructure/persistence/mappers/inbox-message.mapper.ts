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

  static toEntity(domain: InboxMessage): InboxMessageEntity {
    const entity = new InboxMessageEntity();
    entity.consumerName = domain.consumerName;
    entity.messageId = domain.messageId;
    entity.payloadHash = domain.payloadHash;
    entity.receivedAt = domain.receivedAt;
    entity.processedAt = domain.processedAt;
    return entity;
  }
}
