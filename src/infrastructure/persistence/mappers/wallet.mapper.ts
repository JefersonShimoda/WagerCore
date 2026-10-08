import { Wallet } from '../../../domain/wallet/wallet.js';
import { Money } from '../../../domain/shared/money/money.js';
import { WalletEntity } from '../mikroorm/entities/wallet.entity.js';

export class WalletMapper {
  static toDomain(entity: WalletEntity): Wallet {
    return Wallet.rehydrate({
      id: entity.id,
      playerId: entity.playerId,
      currency: entity.currency,
      balance: Money.from({ amount: entity.balance, currency: entity.currency }),
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(domain: Wallet): WalletEntity {
    const entity = new WalletEntity();
    entity.id = domain.id;
    entity.playerId = domain.playerId;
    entity.currency = domain.currency;
    entity.balance = domain.balance.toJSON().amount;
    entity.version = domain.version;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }
}
