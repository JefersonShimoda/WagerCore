import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { InboxMessageRepository } from '../../../../application/ports/repositories/inbox-message.repository.js';
import { InboxMessage } from '../../../../domain/messaging/inbox-message.js';
import { InboxMessageMapper } from '../../mappers/inbox-message.mapper.js';
import { InboxMessageEntity } from '../entities/inbox-message.entity.js';

@Injectable()
export class MikroOrmInboxMessageRepository implements InboxMessageRepository {
  constructor(private readonly em: EntityManager) {}

  async save(message: InboxMessage): Promise<void> {
    const entity = InboxMessageMapper.toEntity(message);
    this.em.persist(entity);
  }

  async findById(consumerName: string, messageId: string): Promise<InboxMessage | null> {
    const entity = await this.em.findOne(InboxMessageEntity, { consumerName, messageId });
    return entity ? InboxMessageMapper.toDomain(entity) : null;
  }
}
