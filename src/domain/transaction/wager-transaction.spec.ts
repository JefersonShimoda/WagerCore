import { describe, expect, it } from 'bun:test';
import { WagerTransaction } from './wager-transaction.js';
import { Money } from '../shared/money/money.js';

describe('WagerTransaction', () => {
  const now = new Date();
  const validProps = {
    providerId: 'provider-a',
    externalTransactionId: 'txn-123',
    idempotencyKey: 'idem-123',
    payloadHash: 'hash',
    walletId: 'w-1',
    playerId: 'p-1',
    roundId: 'r-1',
    gameId: 'g-1',
    amount: '25.00',
    currency: 'BRL',
    now,
  };

  describe('createExternal', () => {
    it('creates a PENDING external transaction', () => {
      const txn = WagerTransaction.createExternal(
        validProps.providerId,
        validProps.externalTransactionId,
        validProps.idempotencyKey,
        validProps.payloadHash,
        validProps.walletId,
        validProps.playerId,
        validProps.roundId,
        validProps.gameId,
        'BET',
        validProps.amount,
        validProps.currency,
        validProps.now,
      );

      expect(txn.id).toBeDefined();
      expect(txn.status).toBe('PENDING');
      expect(txn.kind).toBe('BET');
    });

    it('rejects OPENING as external transaction', () => {
      expect(() => {
        WagerTransaction.createExternal(
          validProps.providerId,
          validProps.externalTransactionId,
          validProps.idempotencyKey,
          validProps.payloadHash,
          validProps.walletId,
          validProps.playerId,
          validProps.roundId,
          validProps.gameId,
          'OPENING',
          validProps.amount,
          validProps.currency,
          validProps.now,
        );
      }).toThrow('OPENING cannot be created as external transaction');
    });

    it('rejects REFUND without reference', () => {
      expect(() => {
        WagerTransaction.createExternal(
          validProps.providerId,
          validProps.externalTransactionId,
          validProps.idempotencyKey,
          validProps.payloadHash,
          validProps.walletId,
          validProps.playerId,
          validProps.roundId,
          validProps.gameId,
          'REFUND',
          validProps.amount,
          validProps.currency,
          validProps.now,
        );
      }).toThrow('REFUND requires referenceExternalTransactionId');
    });

    it('rejects BET with reference', () => {
      expect(() => {
        WagerTransaction.createExternal(
          validProps.providerId,
          validProps.externalTransactionId,
          validProps.idempotencyKey,
          validProps.payloadHash,
          validProps.walletId,
          validProps.playerId,
          validProps.roundId,
          validProps.gameId,
          'BET',
          validProps.amount,
          validProps.currency,
          validProps.now,
          'ref-123'
        );
      }).toThrow('BET must not contain a reference');
    });
  });

  describe('transitions', () => {
    it('can mark processed', () => {
      const txn = WagerTransaction.createExternal(
        validProps.providerId,
        validProps.externalTransactionId,
        validProps.idempotencyKey,
        validProps.payloadHash,
        validProps.walletId,
        validProps.playerId,
        validProps.roundId,
        validProps.gameId,
        'BET',
        validProps.amount,
        validProps.currency,
        validProps.now,
      );

      const balance = Money.from({ amount: '100.00', currency: 'BRL' });
      txn.markProcessed(now, balance);
      
      expect(txn.status).toBe('PROCESSED');
      expect(txn.processedAt).toBe(now);
      expect(txn.resultBalanceAmount).toBe('100.00');
    });

    it('can mark rejected', () => {
      const txn = WagerTransaction.createExternal(
        validProps.providerId,
        validProps.externalTransactionId,
        validProps.idempotencyKey,
        validProps.payloadHash,
        validProps.walletId,
        validProps.playerId,
        validProps.roundId,
        validProps.gameId,
        'BET',
        validProps.amount,
        validProps.currency,
        validProps.now,
      );

      txn.markRejected('INSUFFICIENT_FUNDS', now);
      
      expect(txn.status).toBe('REJECTED');
      expect(txn.failureCode).toBe('INSUFFICIENT_FUNDS');
      expect(txn.processedAt).toBe(now);
    });

    it('cannot mutate terminal state', () => {
      const txn = WagerTransaction.createExternal(
        validProps.providerId,
        validProps.externalTransactionId,
        validProps.idempotencyKey,
        validProps.payloadHash,
        validProps.walletId,
        validProps.playerId,
        validProps.roundId,
        validProps.gameId,
        'BET',
        validProps.amount,
        validProps.currency,
        validProps.now,
      );

      txn.markFailed(now);
      
      expect(() => {
        txn.markProcessed(now);
      }).toThrow('Cannot mutate transaction in terminal state: FAILED');
    });

    it('can transition to PENDING_REFERENCE and increment attempts', () => {
      const txn = WagerTransaction.createExternal(
        validProps.providerId,
        validProps.externalTransactionId,
        validProps.idempotencyKey,
        validProps.payloadHash,
        validProps.walletId,
        validProps.playerId,
        validProps.roundId,
        validProps.gameId,
        'REFUND',
        validProps.amount,
        validProps.currency,
        validProps.now,
        'ref-123'
      );

      const expires = new Date(now.getTime() + 30 * 60 * 1000);
      const next = new Date(now.getTime() + 5000);
      
      txn.markPendingReference(expires, next);
      expect(txn.status).toBe('PENDING_REFERENCE');
      expect(txn.attempts).toBe(1);

      const next2 = new Date(now.getTime() + 10000);
      txn.incrementAttempt(next2);
      expect(txn.attempts).toBe(2);
      expect(txn.nextAttemptAt).toBe(next2);
    });
  });
});
