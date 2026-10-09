import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../ports/transaction-manager.port.js';
import { WagerTransactionRepository } from '../ports/repositories/wager-transaction.repository.js';
import { WalletRepository } from '../ports/repositories/wallet.repository.js';
import { WalletLedgerEntryRepository } from '../ports/repositories/wallet-ledger-entry.repository.js';
import { OutboxMessageRepository } from '../ports/repositories/outbox-message.repository.js';
import { InboxMessageRepository } from '../ports/repositories/inbox-message.repository.js';
import { Clock } from '../ports/clock/clock.port.js';
import { WagerTransaction, TransactionKind } from '../../domain/transaction/wager-transaction.js';
import { WalletLedgerEntry } from '../../domain/wallet/wallet-ledger-entry.js';
import { OutboxMessage } from '../../domain/messaging/outbox-message.js';
import { InboxMessage } from '../../domain/messaging/inbox-message.js';
import { ConflictError } from '../errors/conflict.error.js';
import {
  WalletBalanceChanged,
  WagerTransactionProcessed,
  WagerTransactionRejected,
  WagerTransactionPendingReference
} from '../events/integration.events.js';

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
  inboxMessage?: {
    consumerName: string;
    messageId: string;
  };
}

@Injectable()
export class ProcessWagerTransactionUseCase {
  constructor(
    private readonly transactionManager: TransactionManager,
    private readonly wagerRepo: WagerTransactionRepository,
    private readonly walletRepo: WalletRepository,
    private readonly ledgerRepo: WalletLedgerEntryRepository,
    private readonly outboxRepo: OutboxMessageRepository,
    private readonly clock: Clock,
    private readonly inboxRepo: InboxMessageRepository,
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
      // 2a. Init inbox message
      let inbox: InboxMessage | null = null;
      if (command.inboxMessage) {
        inbox = await this.inboxRepo.findById(command.inboxMessage.consumerName, command.inboxMessage.messageId);
        if (!inbox) {
          inbox = InboxMessage.receive(command.inboxMessage.consumerName, command.inboxMessage.messageId, command.payloadHash, this.clock.now());
        }
      }

      try {
        // Refresh the transaction inside the current transactional EM so updates are tracked
        const currentTxn = await this.wagerRepo.findById(transaction.id);
        if (!currentTxn) throw new Error('Transaction disappeared after insert');

        // 2b. Load wallet with FOR UPDATE
        const wallet = await this.walletRepo.findByIdForUpdate(command.walletId);
        if (!wallet) {
          currentTxn.markRejected('WALLET_NOT_FOUND', this.clock.now());
          await this.wagerRepo.save(currentTxn);
          const event = new WagerTransactionRejected(currentTxn.id, 'WALLET_NOT_FOUND');
          await this.outboxRepo.save(OutboxMessage.create(currentTxn.id, 'WagerTransactionRejected', 1, currentTxn.idempotencyKey, event, this.clock.now()));
          return currentTxn;
        }

        // Check currency mismatch early
        if (wallet.currency !== command.money.currency) {
          currentTxn.markRejected('CURRENCY_MISMATCH', this.clock.now());
          await this.wagerRepo.save(currentTxn);
          const event = new WagerTransactionRejected(currentTxn.id, 'CURRENCY_MISMATCH');
          await this.outboxRepo.save(OutboxMessage.create(currentTxn.id, 'WagerTransactionRejected', 1, currentTxn.idempotencyKey, event, this.clock.now()));
          return currentTxn;
        }

        // 3. Validate domain and references
        if (['WIN', 'REFUND', 'ROLLBACK'].includes(command.kind) && command.referenceExternalTransactionId) {
          const reference = await this.wagerRepo.findByProviderAndExternalId(
            command.providerId,
            command.referenceExternalTransactionId
          );

          if (!reference) {
            const nextAttemptAt = new Date(this.clock.now().getTime() + 5000);
            const expiresAt = new Date(this.clock.now().getTime() + 30 * 60 * 1000);
            currentTxn.markPendingReference(expiresAt, nextAttemptAt);
            await this.wagerRepo.save(currentTxn);
            
            const event = new WagerTransactionPendingReference(currentTxn.id, command.referenceExternalTransactionId);
            await this.outboxRepo.save(OutboxMessage.create(currentTxn.id, 'WagerTransactionPendingReference', 1, currentTxn.idempotencyKey, event, this.clock.now()));
            return currentTxn;
          }

          currentTxn.linkReference(reference.id);
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
            // TODO: implement complete rollback
          }
        } catch (domainError: any) {
          if (domainError.message.includes('Insufficient funds') || domainError.code === 'INSUFFICIENT_FUNDS') {
            currentTxn.markRejected('INSUFFICIENT_FUNDS', this.clock.now());
            await this.wagerRepo.save(currentTxn);
            const event = new WagerTransactionRejected(currentTxn.id, 'INSUFFICIENT_FUNDS');
            await this.outboxRepo.save(OutboxMessage.create(currentTxn.id, 'WagerTransactionRejected', 1, currentTxn.idempotencyKey, event, this.clock.now()));
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

        // 7. Create Outbox records
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

        // Prepare to return; JS will run the finally block before actually returning to commit.
        return currentTxn;
      } finally {
        // 8. Inbox processed (executes before the final return/commit for any completion path)
        if (inbox && !inbox.processedAt) {
          inbox.markProcessed(this.clock.now());
          await this.inboxRepo.save(inbox);
        }
      } // 9. MikroORM executes the DB COMMIT after this block finishes
    });
  }
}
