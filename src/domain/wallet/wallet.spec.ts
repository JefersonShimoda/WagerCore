import { describe, it, expect } from 'bun:test';
import { Wallet } from './wallet.js';
import { Money } from '../shared/money/money.js';
import { DomainError } from '../shared/errors/domain.error.js';

describe('Wallet', () => {
  const now = new Date('2026-07-29T15:00:00.000Z');
  const playerId = '0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1';

  describe('open()', () => {
    it('opens a wallet with positive balance and version 1', () => {
      const balance = Money.from({ amount: '1000.00', currency: 'BRL' });
      const wallet = Wallet.open({ playerId, currency: 'BRL', balance, now });

      expect(wallet.id).toBeDefined();
      expect(wallet.playerId).toBe(playerId);
      expect(wallet.currency).toBe('BRL');
      expect(wallet.version).toBe(1);
      expect(wallet.balance.toJSON().amount).toBe('1000.00');
    });

    it('rejects if initial balance is negative', () => {
      const balance = Money.from({ amount: '-10.00', currency: 'BRL' });
      expect(() => Wallet.open({ playerId, currency: 'BRL', balance, now })).toThrow(DomainError);
    });

    it('rejects if balance currency does not match wallet currency', () => {
      const balance = Money.from({ amount: '100.00', currency: 'USD' });
      expect(() => Wallet.open({ playerId, currency: 'BRL', balance, now })).toThrow(DomainError);
    });
  });

  describe('credit()', () => {
    it('credits positive amount and increments version', () => {
      const wallet = Wallet.open({ 
        playerId, 
        currency: 'BRL', 
        balance: Money.from({ amount: '100.00', currency: 'BRL' }), 
        now 
      });

      const later = new Date('2026-07-29T16:00:00.000Z');
      wallet.credit(Money.from({ amount: '50.00', currency: 'BRL' }), later);

      expect(wallet.balance.toJSON().amount).toBe('150.00');
      expect(wallet.version).toBe(2);
      expect(wallet.updatedAt).toBe(later);
    });

    it('does nothing when crediting zero', () => {
      const wallet = Wallet.open({ 
        playerId, 
        currency: 'BRL', 
        balance: Money.from({ amount: '100.00', currency: 'BRL' }), 
        now 
      });

      wallet.credit(Money.zero('BRL'), now);
      expect(wallet.balance.toJSON().amount).toBe('100.00');
      expect(wallet.version).toBe(1); // Should not increment
    });

    it('rejects mismatch currency', () => {
      const wallet = Wallet.open({ 
        playerId, 
        currency: 'BRL', 
        balance: Money.from({ amount: '100.00', currency: 'BRL' }), 
        now 
      });

      expect(() => wallet.credit(Money.from({ amount: '10.00', currency: 'USD' }), now)).toThrow(DomainError);
    });
  });

  describe('debit()', () => {
    it('debits amount when sufficient funds and increments version', () => {
      const wallet = Wallet.open({ 
        playerId, 
        currency: 'BRL', 
        balance: Money.from({ amount: '100.00', currency: 'BRL' }), 
        now 
      });

      wallet.debit(Money.from({ amount: '40.00', currency: 'BRL' }), now);

      expect(wallet.balance.toJSON().amount).toBe('60.00');
      expect(wallet.version).toBe(2);
    });

    it('rejects debit if insufficient funds (INSUFFICIENT_FUNDS)', () => {
      const wallet = Wallet.open({ 
        playerId, 
        currency: 'BRL', 
        balance: Money.from({ amount: '100.00', currency: 'BRL' }), 
        now 
      });

      let err: any;
      try {
        wallet.debit(Money.from({ amount: '100.01', currency: 'BRL' }), now);
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('INSUFFICIENT_FUNDS');
      
      // State remains unchanged
      expect(wallet.balance.toJSON().amount).toBe('100.00');
      expect(wallet.version).toBe(1);
    });

    it('does nothing when debiting zero', () => {
      const wallet = Wallet.open({ 
        playerId, 
        currency: 'BRL', 
        balance: Money.from({ amount: '100.00', currency: 'BRL' }), 
        now 
      });

      wallet.debit(Money.zero('BRL'), now);
      expect(wallet.version).toBe(1);
    });
  });
});
