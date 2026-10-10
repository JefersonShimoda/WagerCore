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

  static toEntity(domain: Wallet): any {
    return {
      id: domain.id,
      playerId: domain.playerId,
      currency: domain.currency,
      balance: domain.balance.toJSON().amount,
      version: domain.version,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }
}
