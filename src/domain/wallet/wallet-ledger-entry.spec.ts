import { describe, expect, it } from 'bun:test';
import { WalletLedgerEntry } from './wallet-ledger-entry.js';
import { Money } from '../shared/money/money.js';

describe('WalletLedgerEntry', () => {
  const walletId = '0192f291-27dd-7d3f-8071-5f8685deef37';
  const transactionId = '0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1';
  const now = new Date();

  describe('create', () => {
    it('creates a CREDIT entry and updates balance correctly', () => {
      const money = Money.from({ amount: '10.00', currency: 'BRL' });
      const balanceBefore = Money.from({ amount: '50.00', currency: 'BRL' });

      const entry = WalletLedgerEntry.create(walletId, transactionId, 'CREDIT', money, balanceBefore, now);

      expect(entry.id).toBeDefined();
      expect(entry.walletId).toBe(walletId);
      expect(entry.transactionId).toBe(transactionId);
      expect(entry.direction).toBe('CREDIT');
      expect(entry.money.toJSON()).toEqual({ amount: '10.00', currency: 'BRL' });
      expect(entry.balanceBefore.toJSON()).toEqual({ amount: '50.00', currency: 'BRL' });
      expect(entry.balanceAfter.toJSON()).toEqual({ amount: '60.00', currency: 'BRL' });
      expect(entry.createdAt).toBe(now);
    });

    it('creates a DEBIT entry and updates balance correctly', () => {
      const money = Money.from({ amount: '10.00', currency: 'BRL' });
      const balanceBefore = Money.from({ amount: '50.00', currency: 'BRL' });

      const entry = WalletLedgerEntry.create(walletId, transactionId, 'DEBIT', money, balanceBefore, now);

      expect(entry.direction).toBe('DEBIT');
      expect(entry.balanceAfter.toJSON()).toEqual({ amount: '40.00', currency: 'BRL' });
    });

    it('rejects creation if amount is not positive', () => {
      const money = Money.from({ amount: '0.00', currency: 'BRL' });
      const balanceBefore = Money.from({ amount: '50.00', currency: 'BRL' });

      expect(() => {
        WalletLedgerEntry.create(walletId, transactionId, 'CREDIT', money, balanceBefore, now);
      }).toThrow('Ledger entry amount must be positive');
    });

    it('rejects creation if balanceBefore is negative', () => {
      const money = Money.from({ amount: '10.00', currency: 'BRL' });
      const balanceBefore = Money.from({ amount: '-5.00', currency: 'BRL' }); // Using rehydrate trick or manual negation for negative
      
      expect(() => {
        WalletLedgerEntry.create(walletId, transactionId, 'CREDIT', money, balanceBefore, now);
      }).toThrow('Ledger entry balanceBefore must be non-negative');
    });

    it('rejects creation if balanceAfter would be negative on DEBIT', () => {
      const money = Money.from({ amount: '60.00', currency: 'BRL' });
      const balanceBefore = Money.from({ amount: '50.00', currency: 'BRL' });

      expect(() => {
        WalletLedgerEntry.create(walletId, transactionId, 'DEBIT', money, balanceBefore, now);
      }).toThrow('Ledger entry balanceAfter cannot be negative');
    });

    it('rejects creation if currencies mismatch', () => {
      const money = Money.from({ amount: '10.00', currency: 'USD' });
      const balanceBefore = Money.from({ amount: '50.00', currency: 'BRL' });

      expect(() => {
        WalletLedgerEntry.create(walletId, transactionId, 'CREDIT', money, balanceBefore, now);
      }).toThrow('Ledger entry money and balanceBefore must have the same currency');
    });
  });
});
