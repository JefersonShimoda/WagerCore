import { Injectable } from '@nestjs/common';
import { WagerTransactionRepository } from '../ports/repositories/wager-transaction.repository.js';
import { WalletRepository } from '../ports/repositories/wallet.repository.js';
import { WalletLedgerEntryRepository } from '../ports/repositories/wallet-ledger-entry.repository.js';
import { OutboxMessageRepository } from '../ports/repositories/outbox-message.repository.js';
import { TransactionManager } from '../ports/transaction-manager.port.js';
import { Clock } from '../ports/clock/clock.port.js';
import { OutboxMessage } from '../../domain/messaging/outbox-message.js';
import { WalletLedgerEntry } from '../../domain/wallet/wallet-ledger-entry.js';
import { WagerTransactionRejected, WagerTransactionProcessed, WalletBalanceChanged } from '../events/integration.events.js';

export interface ReprocessPendingReferenceCommand {
  wagerTransactionId: string;
}

@Injectable()
export class ReprocessPendingReferenceUseCase {
  constructor(
    private readonly transactionManager: TransactionManager,
    private readonly wagerRepo: WagerTransactionRepository,
    private readonly walletRepo: WalletRepository,
    private readonly ledgerRepo: WalletLedgerEntryRepository,
    private readonly outboxRepo: OutboxMessageRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: ReprocessPendingReferenceCommand): Promise<void> {
    await this.transactionManager.transactional(async () => {
      const currentTxn = await this.wagerRepo.findByIdForUpdate(command.wagerTransactionId);
      if (!currentTxn || currentTxn.status !== 'PENDING_REFERENCE') {
        return;
      }

      if (currentTxn.expiresAt && this.clock.now() > currentTxn.expiresAt) {
        currentTxn.markRejected('REFERENCE_NOT_FOUND', this.clock.now());
        await this.wagerRepo.save(currentTxn);
        const event = new WagerTransactionRejected(currentTxn.id, 'REFERENCE_NOT_FOUND');
        await this.outboxRepo.save(OutboxMessage.create(currentTxn.id, 'WagerTransactionRejected', 1, currentTxn.idempotencyKey, event, this.clock.now()));
        return;
      }

      const reference = await this.wagerRepo.findByProviderAndExternalId(
        currentTxn.providerId,
        currentTxn.referenceExternalTransactionId!
      );

      if (!reference) {
        // Increment attempts and schedule for later (exponential backoff)
        const backoffMs = Math.pow(2, currentTxn.attempts) * 5000;
        const nextAttemptAt = new Date(this.clock.now().getTime() + backoffMs);
        currentTxn.incrementAttempt(nextAttemptAt);
        await this.wagerRepo.save(currentTxn);
        return;
      }

      currentTxn.linkReference(reference.id);

      const rejectTxn = async (code: any) => {
        currentTxn.markRejected(code, this.clock.now());
        await this.wagerRepo.save(currentTxn);
        const event = new WagerTransactionRejected(currentTxn.id, code);
        await this.outboxRepo.save(OutboxMessage.create(currentTxn.id, 'WagerTransactionRejected', 1, currentTxn.idempotencyKey, event, this.clock.now()));
      };

      if (['REFUND', 'ROLLBACK'].includes(currentTxn.kind)) {
        if (
          reference.providerId !== currentTxn.providerId ||
          reference.playerId !== currentTxn.playerId ||
          reference.walletId !== currentTxn.walletId ||
          reference.currency !== currentTxn.currency ||
          reference.roundId !== currentTxn.roundId
        ) {
          await rejectTxn('INVALID_REFERENCE');
          return;
        }

        if (currentTxn.kind === 'REFUND' && reference.kind !== 'BET') {
          await rejectTxn('INVALID_REFERENCE');
          return;
        }
        if (currentTxn.kind === 'ROLLBACK' && !['BET', 'WIN', 'REFUND'].includes(reference.kind)) {
          await rejectTxn('INVALID_REFERENCE');
          return;
        }

        if (!currentTxn.money.equals(reference.money)) {
          await rejectTxn('INVALID_REFERENCE');
          return;
        }

        const alreadyReversed = await this.wagerRepo.hasReversal(reference.id, currentTxn.kind);
        if (alreadyReversed) {
          await rejectTxn('ALREADY_REVERSED');
          return;
        }
      }

      const wallet = await this.walletRepo.findByIdForUpdate(currentTxn.walletId);
      if (!wallet) {
        await rejectTxn('WALLET_NOT_FOUND');
        return;
      }

      const balanceBefore = wallet.balance;
      let direction: 'DEBIT' | 'CREDIT' | null = null;
      const appliedAmount = currentTxn.money;

      try {
        if (currentTxn.kind === 'BET') {
          wallet.debit(appliedAmount, this.clock.now());
          direction = 'DEBIT';
        } else if (currentTxn.kind === 'WIN' || currentTxn.kind === 'REFUND') {
          wallet.credit(appliedAmount, this.clock.now());
          direction = 'CREDIT';
        } else if (currentTxn.kind === 'LOSS') {
          // No money movement
        } else if (currentTxn.kind === 'ROLLBACK') {
          direction = currentTxn.ledgerDirectionFor(reference!);
          if (direction === 'DEBIT') {
            wallet.debit(appliedAmount, this.clock.now());
          } else {
            wallet.credit(appliedAmount, this.clock.now());
          }
        }
      } catch (domainError: any) {
        if (domainError.message.includes('Insufficient funds') || domainError.code === 'INSUFFICIENT_FUNDS') {
          const failureCode = currentTxn.kind === 'ROLLBACK' ? 'REVERSAL_WOULD_OVERDRAW' : 'INSUFFICIENT_FUNDS';
          await rejectTxn(failureCode);
          return;
        }
        throw domainError;
      }

      if (direction) {
        const entry = WalletLedgerEntry.create(
          wallet.id,
          currentTxn.id,
          direction,
          appliedAmount,
          balanceBefore,
          this.clock.now()
        );
        await this.ledgerRepo.save(entry);
      }

      currentTxn.markProcessed(this.clock.now(), wallet.balance);
      await this.walletRepo.save(wallet);
      await this.wagerRepo.save(currentTxn);

      const processedEvent = new WagerTransactionProcessed(
        currentTxn.id,
        wallet.id,
        currentTxn.kind,
        wallet.balance.toJSON().amount,
        wallet.currency
      );
      await this.outboxRepo.save(OutboxMessage.create(
        currentTxn.id,
        'WagerTransactionProcessed',
        1,
        currentTxn.idempotencyKey,
        processedEvent,
        this.clock.now()
      ));

      if (direction) {
        const balanceEvent = new WalletBalanceChanged(
          wallet.id,
          wallet.playerId,
          wallet.currency,
          wallet.balance.toJSON().amount,
          wallet.version
        );
        await this.outboxRepo.save(OutboxMessage.create(
          wallet.id,
          'WalletBalanceChanged',
          1,
          `${currentTxn.idempotencyKey}-balance`,
          balanceEvent,
          this.clock.now()
        ));
      }
    });
  }
}
