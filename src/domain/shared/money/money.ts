import { Decimal } from 'decimal.js';
import { DomainError } from '../errors/domain.error.js';

export interface MoneyDto {
  amount: string;
  currency: string;
}

export class Money {
  private readonly value: Decimal;
  public readonly currency: string;

  private constructor(value: Decimal, currency: string) {
    this.value = value;
    this.currency = currency.toUpperCase();
  }

  static from(dto: MoneyDto): Money {
    if (!dto.amount || typeof dto.amount !== 'string') {
      throw new DomainError('Amount must be a string', 'INVALID_AMOUNT');
    }

    if (!/^-?\d+\.\d{2}$/.test(dto.amount)) {
      throw new DomainError('Amount must be a decimal string with exactly two decimal places', 'INVALID_AMOUNT');
    }

    const value = new Decimal(dto.amount);
    
    if (value.isNaN() || !value.isFinite()) {
      throw new DomainError('Amount must be a finite number', 'INVALID_AMOUNT');
    }

    if (!dto.currency || typeof dto.currency !== 'string') {
      throw new DomainError('Currency is required', 'INVALID_CURRENCY');
    }

    return new Money(value, dto.currency);
  }

  static zero(currency: string): Money {
    return new Money(new Decimal('0.00'), currency);
  }

  private checkCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new DomainError(`Currency mismatch: ${this.currency} vs ${other.currency}`, 'CURRENCY_MISMATCH');
    }
  }

  add(other: Money): Money {
    this.checkCurrency(other);
    return new Money(this.value.plus(other.value), this.currency);
  }

  subtract(other: Money): Money {
    this.checkCurrency(other);
    return new Money(this.value.minus(other.value), this.currency);
  }

  negate(): Money {
    return new Money(this.value.negated(), this.currency);
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isPositive(): boolean {
    return this.value.isPositive() && !this.value.isZero();
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  isLessThan(other: Money): boolean {
    this.checkCurrency(other);
    return this.value.lessThan(other.value);
  }

  equals(other: Money): boolean {
    this.checkCurrency(other);
    return this.value.equals(other.value);
  }

  toJSON(): MoneyDto {
    return {
      amount: this.value.toFixed(2),
      currency: this.currency,
    };
  }

  toString(): string {
    return `${this.value.toFixed(2)} ${this.currency}`;
  }
}
