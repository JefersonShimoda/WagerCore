import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { WagerTransactionRepository } from '../../../../application/ports/repositories/wager-transaction.repository.js';
import { WagerTransaction } from '../../../../domain/transaction/wager-transaction.js';
import { WagerTransactionEntity } from '../entities/wager-transaction.entity.js';
import { WagerTransactionMapper } from '../../mappers/wager-transaction.mapper.js';

@Injectable()
export class MikroOrmWagerTransactionRepository implements WagerTransactionRepository {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<WagerTransaction | null> {
    const entity = await this.em.findOne(WagerTransactionEntity, { id });
    return entity ? WagerTransactionMapper.toDomain(entity) : null;
  }

  async findByIdForUpdate(id: string): Promise<WagerTransaction | null> {
    const entity = await this.em.findOne(WagerTransactionEntity, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    return entity ? WagerTransactionMapper.toDomain(entity) : null;
  }

  async findPendingReferenceIds(limit: number, now: Date): Promise<string[]> {
    const qb = this.em.createQueryBuilder(WagerTransactionEntity);
    const entities = await qb
      .select('id')
      .where({
        status: 'PENDING_REFERENCE',
        nextAttemptAt: { $lte: now }
      })
      .limit(limit)
      .execute();
    return entities.map((row: any) => row.id);
  }

  async findByProviderAndExternalId(providerId: string, externalTransactionId: string): Promise<WagerTransaction | null> {
    const entity = await this.em.findOne(WagerTransactionEntity, { providerId, externalTransactionId });
    return entity ? WagerTransactionMapper.toDomain(entity) : null;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<WagerTransaction | null> {
    const entity = await this.em.findOne(WagerTransactionEntity, { idempotencyKey });
    return entity ? WagerTransactionMapper.toDomain(entity) : null;
  }

  async hasReversal(referenceTransactionId: string, kind: string): Promise<boolean> {
    const qb = this.em.createQueryBuilder(WagerTransactionEntity);
    const result = await qb
      .count()
      .where({
        referenceTransactionId,
        kind,
        status: 'PROCESSED'
      })
      .execute('get');
    return Number(result.count) > 0;
  }

  async insertIdempotencyCheck(transaction: WagerTransaction): Promise<boolean> {
    const entity = WagerTransactionMapper.toPersistence(transaction);
    
    const qb = this.em.createQueryBuilder(WagerTransactionEntity);
    const res = await qb
      .insert(entity)
      .onConflict('idempotencyKey')
      .ignore()
      .returning('id')
      .execute();
    return (res as any).affectedRows > 0;
  }

  async save(transaction: WagerTransaction): Promise<void> {
    const entity = WagerTransactionMapper.toPersistence(transaction);
    const exists = await this.em.findOne(WagerTransactionEntity, { id: transaction.id });
    if (exists) {
      this.em.assign(exists, entity);
      this.em.persist(exists);
    } else {
      this.em.persist(entity);
    }
  }
}
