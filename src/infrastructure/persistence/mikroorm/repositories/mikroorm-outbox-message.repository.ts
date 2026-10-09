import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { OutboxMessageRepository } from '../../../../application/ports/repositories/outbox-message.repository.js';
import { OutboxMessage } from '../../../../domain/messaging/outbox-message.js';
import { OutboxMessageMapper } from '../../mappers/outbox-message.mapper.js';
import { OutboxMessageEntity } from '../entities/outbox-message.entity.js';

@Injectable()
export class MikroOrmOutboxMessageRepository implements OutboxMessageRepository {
  constructor(private readonly em: EntityManager) {}

  async save(message: OutboxMessage): Promise<void> {
    const entity = OutboxMessageMapper.toEntity(message);
    const exists = await this.em.findOne(OutboxMessageEntity, { id: message.id });
    if (exists) {
      this.em.assign(exists, entity);
      this.em.persist(exists);
    } else {
      this.em.persist(entity);
    }
  }

  async saveAll(messages: OutboxMessage[]): Promise<void> {
    const entities = messages.map(msg => OutboxMessageMapper.toEntity(msg));
    this.em.persist(entities);
  }
}
