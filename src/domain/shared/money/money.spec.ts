import { describe, it, expect } from 'bun:test';
import { Money } from './money.js';
import { DomainError } from '../errors/domain.error.js';

describe('Money', () => {
  describe('from()', () => {
    it('creates Money from valid positive amount', () => {
      const money = Money.from({ amount: '25.00', currency: 'BRL' });
      expect(money.currency).toBe('BRL');
      expect(money.toJSON().amount).toBe('25.00');
    });

    it('creates Money from valid negative amount', () => {
      const money = Money.from({ amount: '-25.00', currency: 'USD' });
      expect(money.currency).toBe('USD');
      expect(money.isNegative()).toBe(true);
    });

    it('rejects numbers, floats, or missing amounts', () => {
      expect(() => Money.from({ amount: 25 as any, currency: 'BRL' })).toThrow(DomainError);
      expect(() => Money.from({ amount: '', currency: 'BRL' })).toThrow(DomainError);
    });

    it('rejects strings without exactly two decimal places', () => {
      expect(() => Money.from({ amount: '25', currency: 'BRL' })).toThrow(DomainError);
      expect(() => Money.from({ amount: '25.0', currency: 'BRL' })).toThrow(DomainError);
      expect(() => Money.from({ amount: '25.000', currency: 'BRL' })).toThrow(DomainError);
      expect(() => Money.from({ amount: '25,00', currency: 'BRL' })).toThrow(DomainError);
    });

    it('rejects scientific notation or malformed strings', () => {
      expect(() => Money.from({ amount: '2e1', currency: 'BRL' })).toThrow(DomainError);
      expect(() => Money.from({ amount: 'NaN', currency: 'BRL' })).toThrow(DomainError);
      expect(() => Money.from({ amount: 'Infinity', currency: 'BRL' })).toThrow(DomainError);
      expect(() => Money.from({ amount: '10.00a', currency: 'BRL' })).toThrow(DomainError);
    });

    it('capitalizes currency', () => {
      const money = Money.from({ amount: '10.00', currency: 'brl' });
      expect(money.currency).toBe('BRL');
    });
  });

  describe('zero()', () => {
    it('creates zero amount', () => {
      const money = Money.zero('BRL');
      expect(money.isZero()).toBe(true);
      expect(money.toJSON().amount).toBe('0.00');
    });
  });

  describe('math operations', () => {
    const ten = Money.from({ amount: '10.00', currency: 'BRL' });
    const five = Money.from({ amount: '5.00', currency: 'BRL' });

    it('adds correctly', () => {
      const result = ten.add(five);
      expect(result.toJSON().amount).toBe('15.00');
      expect(ten.toJSON().amount).toBe('10.00');
    });

    it('subtracts correctly', () => {
      const result = ten.subtract(five);
      expect(result.toJSON().amount).toBe('5.00');
    });

    it('negates correctly', () => {
      const result = ten.negate();
      expect(result.toJSON().amount).toBe('-10.00');
    });

    it('rejects arithmetic with different currencies', () => {
      const usd = Money.from({ amount: '5.00', currency: 'USD' });
      expect(() => ten.add(usd)).toThrow(DomainError);
      expect(() => ten.subtract(usd)).toThrow(DomainError);
    });
  });

  describe('comparisons', () => {
    const ten = Money.from({ amount: '10.00', currency: 'BRL' });
    const otherTen = Money.from({ amount: '10.00', currency: 'BRL' });
    const five = Money.from({ amount: '5.00', currency: 'BRL' });
    const minusFive = Money.from({ amount: '-5.00', currency: 'BRL' });

    it('checks positive/negative/zero', () => {
      expect(ten.isPositive()).toBe(true);
      expect(ten.isNegative()).toBe(false);
      expect(ten.isZero()).toBe(false);

      expect(minusFive.isPositive()).toBe(false);
      expect(minusFive.isNegative()).toBe(true);
      expect(minusFive.isZero()).toBe(false);

      const zero = Money.zero('BRL');
      expect(zero.isPositive()).toBe(false);
      expect(zero.isNegative()).toBe(false);
      expect(zero.isZero()).toBe(true);
    });

    it('checks equals', () => {
      expect(ten.equals(otherTen)).toBe(true);
      expect(ten.equals(five)).toBe(false);
    });

    it('checks lessThan', () => {
      expect(five.isLessThan(ten)).toBe(true);
      expect(ten.isLessThan(five)).toBe(false);
      expect(ten.isLessThan(ten)).toBe(false);
    });

    it('rejects comparisons across currencies', () => {
      const usd = Money.from({ amount: '10.00', currency: 'USD' });
      expect(() => ten.equals(usd)).toThrow(DomainError);
      expect(() => ten.isLessThan(usd)).toThrow(DomainError);
    });
  });
});
