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
    const exists = await this.em.findOne(WalletEntity, { id: wallet.id });
    if (exists) {
      exists.balance = wallet.balance.toJSON().amount;
      exists.version = wallet.version;
      exists.updatedAt = wallet.updatedAt;
      this.em.persist(exists);
    } else {
      const newEntity = this.em.create(WalletEntity, {
        id: wallet.id,
        playerId: wallet.playerId,
        currency: wallet.currency,
        balance: wallet.balance.toJSON().amount,
        version: wallet.version,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      });
      this.em.persist(newEntity);
    }
    await this.em.flush();
  }
}
