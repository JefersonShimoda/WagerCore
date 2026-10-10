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

  static toPersistence(domain: WalletLedgerEntry): any {
    return {
      id: domain.id,
      walletId: domain.walletId,
      transactionId: domain.transactionId,
      direction: domain.direction,
      amount: domain.money.toJSON().amount,
      currency: domain.money.currency,
      balanceBeforeAmount: domain.balanceBefore.toJSON().amount,
      balanceBeforeCurrency: domain.balanceBefore.currency,
      balanceAfterAmount: domain.balanceAfter.toJSON().amount,
      balanceAfterCurrency: domain.balanceAfter.currency,
      createdAt: domain.createdAt,
    };
  }
}
