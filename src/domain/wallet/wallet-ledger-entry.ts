import { v7 as uuidv7 } from 'uuid';
import { Money } from '../shared/money/money.js';
import { DomainError } from '../shared/errors/domain.error.js';

export type LedgerDirection = 'DEBIT' | 'CREDIT';

export interface WalletLedgerEntryProps {
  id: string;
  walletId: string;
  transactionId: string;
  direction: LedgerDirection;
  money: Money;
  balanceBefore: Money;
  balanceAfter: Money;
  createdAt: Date;
}

export class WalletLedgerEntry {
  private constructor(private readonly props: WalletLedgerEntryProps) {}

  public get id(): string {
    return this.props.id;
  }

  public get walletId(): string {
    return this.props.walletId;
  }

  public get transactionId(): string {
    return this.props.transactionId;
  }

  public get direction(): LedgerDirection {
    return this.props.direction;
  }

  public get money(): Money {
    return this.props.money;
  }

  public get balanceBefore(): Money {
    return this.props.balanceBefore;
  }

  public get balanceAfter(): Money {
    return this.props.balanceAfter;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public static create(
    walletId: string,
    transactionId: string,
    direction: LedgerDirection,
    money: Money,
    balanceBefore: Money,
    createdAt: Date,
  ): WalletLedgerEntry {
    if (!money.isPositive()) {
      throw new DomainError('Ledger entry amount must be positive');
    }

    if (balanceBefore.isNegative()) {
      throw new DomainError('Ledger entry balanceBefore must be non-negative');
    }

    if (money.currency !== balanceBefore.currency) {
      throw new DomainError('Ledger entry money and balanceBefore must have the same currency');
    }

    let balanceAfter: Money;

    if (direction === 'DEBIT') {
      balanceAfter = balanceBefore.subtract(money);
    } else {
      balanceAfter = balanceBefore.add(money);
    }

    // Prevents ledger immutability violations mathematically
    if (balanceAfter.isNegative()) {
      throw new DomainError('Ledger entry balanceAfter cannot be negative');
    }

    return new WalletLedgerEntry({
      id: uuidv7(),
      walletId,
      transactionId,
      direction,
      money,
      balanceBefore,
      balanceAfter,
      createdAt,
    });
  }

  public static rehydrate(props: WalletLedgerEntryProps): WalletLedgerEntry {
    return new WalletLedgerEntry(props);
  }
}
