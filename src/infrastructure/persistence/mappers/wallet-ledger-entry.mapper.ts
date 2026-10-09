import { WalletLedgerEntry, LedgerDirection } from '../../../domain/wallet/wallet-ledger-entry.js';
import { Money } from '../../../domain/shared/money/money.js';
import { WalletLedgerEntryEntity } from '../mikroorm/entities/wallet-ledger-entry.entity.js';

export class WalletLedgerEntryMapper {
  static toDomain(entity: WalletLedgerEntryEntity): WalletLedgerEntry {
    return WalletLedgerEntry.rehydrate({
      id: entity.id,
      walletId: entity.walletId,
      transactionId: entity.transactionId,
      direction: entity.direction as LedgerDirection,
      money: Money.from({ amount: entity.amount, currency: entity.currency }),
      balanceBefore: Money.from({ amount: entity.balanceBeforeAmount, currency: entity.balanceBeforeCurrency }),
      balanceAfter: Money.from({ amount: entity.balanceAfterAmount, currency: entity.balanceAfterCurrency }),
      createdAt: entity.createdAt,
    });
  }

  static toPersistence(domain: WalletLedgerEntry): WalletLedgerEntryEntity {
    const entity = new WalletLedgerEntryEntity();
    entity.id = domain.id;
    entity.walletId = domain.walletId;
    entity.transactionId = domain.transactionId;
    entity.direction = domain.direction;
    entity.amount = domain.money.toJSON().amount;
    entity.currency = domain.money.currency;
    entity.balanceBeforeAmount = domain.balanceBefore.toJSON().amount;
    entity.balanceBeforeCurrency = domain.balanceBefore.currency;
    entity.balanceAfterAmount = domain.balanceAfter.toJSON().amount;
    entity.balanceAfterCurrency = domain.balanceAfter.currency;
    entity.createdAt = domain.createdAt;
    
    return entity;
  }
}
