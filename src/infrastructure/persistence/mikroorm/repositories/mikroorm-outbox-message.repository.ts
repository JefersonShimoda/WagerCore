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
    const data = OutboxMessageMapper.toEntity(message);
    const exists = await this.em.findOne(OutboxMessageEntity, { id: message.id });
    if (exists) {
      this.em.assign(exists, data);
      this.em.persist(exists);
    } else {
      const entity = this.em.create(OutboxMessageEntity, data);
      this.em.persist(entity);
    }
  }

  async saveAll(messages: OutboxMessage[]): Promise<void> {
    const entities = messages.map(msg => this.em.create(OutboxMessageEntity, OutboxMessageMapper.toEntity(msg)));
    this.em.persist(entities);
  }

  async findPendingForUpdateAndLease(limit: number, leaseUntil: Date, now: Date): Promise<OutboxMessage[]> {
    const connection = this.em.getConnection();
    const sql = `
      UPDATE outbox_messages
      SET lease_until = ?
      WHERE id IN (
        SELECT id FROM outbox_messages
        WHERE status = 'PENDING' AND (lease_until IS NULL OR lease_until <= ?)
        ORDER BY occurred_at ASC
        LIMIT ?
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `;
    const res = await connection.execute(sql, [leaseUntil, now, limit]);
    const entities = res.map((row: any) => this.em.map(OutboxMessageEntity, row));
    return entities.map((entity: OutboxMessageEntity) => OutboxMessageMapper.toDomain(entity));
  }
}
