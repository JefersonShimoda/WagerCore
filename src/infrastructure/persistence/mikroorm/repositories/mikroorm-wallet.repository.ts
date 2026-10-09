import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { WalletRepository } from '../../../../application/ports/repositories/wallet.repository.js';
import { Wallet } from '../../../../domain/wallet/wallet.js';
import { WalletEntity } from '../entities/wallet.entity.js';
import { WalletMapper } from '../../mappers/wallet.mapper.js';

@Injectable()
export class MikroOrmWalletRepository implements WalletRepository {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<Wallet | null> {
    const entity = await this.em.findOne(WalletEntity, { id });
    return entity ? WalletMapper.toDomain(entity) : null;
  }

  async findByPlayerAndCurrency(playerId: string, currency: string): Promise<Wallet | null> {
    const entity = await this.em.findOne(WalletEntity, { playerId, currency });
    return entity ? WalletMapper.toDomain(entity) : null;
  }

  async findByIdForUpdate(id: string): Promise<Wallet | null> {
    const entity = await this.em.findOne(
      WalletEntity,
      { id },
      { lockMode: LockMode.PESSIMISTIC_WRITE }
    );
    return entity ? WalletMapper.toDomain(entity) : null;
  }

  async save(wallet: Wallet): Promise<void> {
    const entity = WalletMapper.toEntity(wallet);
    // Use upsert or EM merge to update/insert properly
    const exists = await this.em.findOne(WalletEntity, { id: wallet.id });
    if (exists) {
      exists.balance = entity.balance;
      exists.version = entity.version;
      exists.updatedAt = entity.updatedAt;
      this.em.persist(exists);
    } else {
      this.em.persist(entity);
    }
    await this.em.flush();
  }
}
