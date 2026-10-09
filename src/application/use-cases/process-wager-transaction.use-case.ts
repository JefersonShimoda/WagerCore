import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../ports/transaction-manager.port.js';
import { WagerTransactionRepository } from '../ports/repositories/wager-transaction.repository.js';
import { WalletRepository } from '../ports/repositories/wallet.repository.js';
import { WalletLedgerEntryRepository } from '../ports/repositories/wallet-ledger-entry.repository.js';
import { Clock } from '../ports/clock/clock.port.js';
import { WagerTransaction, TransactionKind } from '../../domain/transaction/wager-transaction.js';
import { WalletLedgerEntry } from '../../domain/wallet/wallet-ledger-entry.js';
import { ConflictError } from '../errors/conflict.error.js';

export interface ProcessWagerTransactionCommand {
  providerId: string;
  externalTransactionId: string;
  idempotencyKey: string;
  payloadHash: string;
  walletId: string;
  playerId: string;
  roundId: string;
  gameId: string;
  kind: TransactionKind;
  money: { amount: string; currency: string };
  referenceExternalTransactionId?: string;
}

@Injectable()
export class ProcessWagerTransactionUseCase {
  constructor(
    private readonly transactionManager: TransactionManager,
    private readonly wagerRepo: WagerTransactionRepository,
    private readonly walletRepo: WalletRepository,
    private readonly ledgerRepo: WalletLedgerEntryRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: ProcessWagerTransactionCommand): Promise<WagerTransaction> {
    const now = this.clock.now();
    const transaction = WagerTransaction.createExternal(
      command.providerId,
      command.externalTransactionId,
      command.idempotencyKey,
      command.payloadHash,
      command.walletId,
      command.playerId,
      command.roundId,
      command.gameId,
      command.kind,
      command.money.amount,
      command.money.currency,
      now,
      command.referenceExternalTransactionId
    );

    // 1. Idempotency insert/check
    let inserted = false;
    try {
      inserted = await this.wagerRepo.insertIdempotencyCheck(transaction);
    } catch (e: any) {
      if (e.name === 'UniqueConstraintViolationException') {
        // If it's not the idempotency_key, it must be the provider+externalId constraint
        throw new ConflictError('External transaction identity conflict', 'EXTERNAL_TRANSACTION_CONFLICT');
      }
      throw e;
    }

    if (!inserted) {
      const existing = await this.wagerRepo.findByIdempotencyKey(command.idempotencyKey);
      if (!existing) {
        throw new Error('Idempotency collision detected but record not found');
      }
      if (existing.payloadHash !== command.payloadHash) {
        throw new ConflictError('Payload hash mismatch for idempotency key', 'IDEMPOTENCY_CONFLICT');
      }
      // Idempotent replay: return the durable existing state
      return existing;
    }

    return this.transactionManager.transactional(async () => {
      // Refresh the transaction inside the current transactional EM so updates are tracked
      const currentTxn = await this.wagerRepo.findById(transaction.id);
      if (!currentTxn) throw new Error('Transaction disappeared after insert');

      // 2. Load wallet with FOR UPDATE
      const wallet = await this.walletRepo.findByIdForUpdate(command.walletId);
      if (!wallet) {
        currentTxn.markRejected('WALLET_NOT_FOUND', this.clock.now());
        await this.wagerRepo.save(currentTxn);
        return currentTxn;
      }

      // Check currency mismatch early
      if (wallet.currency !== command.money.currency) {
        currentTxn.markRejected('CURRENCY_MISMATCH', this.clock.now());
        await this.wagerRepo.save(currentTxn);
        return currentTxn;
      }

      // 3. Validate domain and references
      // TODO: Resolve reference if required (WIN, REFUND, ROLLBACK)
      // For now, if reference is required but we haven't resolved it, mark PENDING_REFERENCE
      if (['WIN', 'REFUND', 'ROLLBACK'].includes(command.kind) && command.referenceExternalTransactionId) {
        const reference = await this.wagerRepo.findByProviderAndExternalId(
          command.providerId,
          command.referenceExternalTransactionId
        );

        if (!reference) {
          // It's missing, go to PENDING_REFERENCE
          // Pending reference retry schedule logic
          const nextAttemptAt = new Date(this.clock.now().getTime() + 5000);
          const expiresAt = new Date(this.clock.now().getTime() + 30 * 60 * 1000);
          currentTxn.markPendingReference(expiresAt, nextAttemptAt);
          await this.wagerRepo.save(currentTxn);
          // Emit WagerTransactionPendingReference event (Outbox)
          return currentTxn;
        }

        currentTxn.linkReference(reference.id);
        
        // TODO: Validate reference rules (status must be PROCESSED, kind logic, etc)
        // If reference is invalid: currentTxn.markRejected('INVALID_REFERENCE', ...)
      }

      // 4. Apply financial operation
      const balanceBefore = wallet.balance;
      let direction: 'DEBIT' | 'CREDIT' | null = null;
      let appliedAmount = currentTxn.money;

      try {
        if (command.kind === 'BET') {
          wallet.debit(appliedAmount, this.clock.now());
          direction = 'DEBIT';
        } else if (command.kind === 'WIN' || command.kind === 'REFUND') {
          wallet.credit(appliedAmount, this.clock.now());
          direction = 'CREDIT';
        } else if (command.kind === 'LOSS') {
          // No money movement
        } else if (command.kind === 'ROLLBACK') {
          // Inverse of original financial direction (needs reference loading)
          // Simplified for now, will implement exact rollback logic
          // TODO: implement complete rollback
        }
      } catch (domainError: any) {
        // Map domain errors to failure codes
        if (domainError.message.includes('Insufficient funds') || domainError.code === 'INSUFFICIENT_FUNDS') {
          currentTxn.markRejected('INSUFFICIENT_FUNDS', this.clock.now());
          await this.wagerRepo.save(currentTxn);
          return currentTxn;
        }
        throw domainError;
      }

      // 5. Create ledger entry
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

      // 6. Persist transaction result
      currentTxn.markProcessed(this.clock.now(), wallet.balance);
      await this.walletRepo.save(wallet);
      await this.wagerRepo.save(currentTxn);

      // 7. Create Outbox records (TODO)
      // 8. Inbox processed (TODO)

      return currentTxn; // 9. Commit
    });
  }
}
