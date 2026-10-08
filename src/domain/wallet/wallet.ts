import { Money } from '../shared/money/money.js';
import { DomainError } from '../shared/errors/domain.error.js';
import { v7 as uuidv7 } from 'uuid';

export interface WalletOpenProps {
  playerId: string;
  currency: string;
  balance: Money;
  now: Date;
}

export interface WalletRehydrateProps {
  id: string;
  playerId: string;
  currency: string;
  balance: Money;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Wallet {
  public readonly id: string;
  public readonly playerId: string;
  public readonly currency: string;
  private _balance: Money;
  private _version: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: WalletRehydrateProps) {
    this.id = props.id;
    this.playerId = props.playerId;
    this.currency = props.currency;
    this._balance = props.balance;
    this._version = props.version;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;

    if (this._balance.isNegative()) {
      throw new DomainError('Wallet balance cannot be negative', 'INVALID_STATE');
    }
    if (this._balance.currency !== this.currency) {
      throw new DomainError('Balance currency mismatch', 'INVALID_STATE');
    }
  }

  static open({ playerId, currency, balance, now }: WalletOpenProps): Wallet {
    return new Wallet({
      id: uuidv7(),
      playerId,
      currency: currency.toUpperCase(),
      balance,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: WalletRehydrateProps): Wallet {
    return new Wallet(props);
  }

  get balance(): Money {
    return this._balance;
  }

  get version(): number {
    return this._version;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  private checkCurrency(money: Money): void {
    if (money.currency !== this.currency) {
      throw new DomainError('Operation currency mismatch', 'CURRENCY_MISMATCH');
    }
  }

  credit(money: Money, now: Date): void {
    this.checkCurrency(money);
    
    if (money.isZero()) return;

    this._balance = this._balance.add(money);
    this._version++;
    this._updatedAt = now;
  }

  debit(money: Money, now: Date): void {
    this.checkCurrency(money);

    if (money.isZero()) return;

    if (this._balance.isLessThan(money)) {
      throw new DomainError('Insufficient funds', 'INSUFFICIENT_FUNDS');
    }

    this._balance = this._balance.subtract(money);
    this._version++;
    this._updatedAt = now;
  }
}
