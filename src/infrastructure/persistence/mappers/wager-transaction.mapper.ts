import { WagerTransaction, TransactionKind, TransactionStatus, FailureCode } from '../../../domain/transaction/wager-transaction.js';
import { WagerTransactionEntity } from '../mikroorm/entities/wager-transaction.entity.js';

export class WagerTransactionMapper {
  static toDomain(entity: WagerTransactionEntity): WagerTransaction {
    return WagerTransaction.rehydrate({
      id: entity.id,
      providerId: entity.providerId,
      externalTransactionId: entity.externalTransactionId,
      idempotencyKey: entity.idempotencyKey,
      payloadHash: entity.payloadHash,
      walletId: entity.walletId,
      playerId: entity.playerId,
      roundId: entity.roundId,
      gameId: entity.gameId,
      kind: entity.kind as TransactionKind,
      amount: entity.amount,
      currency: entity.currency,
      referenceExternalTransactionId: entity.referenceExternalTransactionId,
      referenceTransactionId: entity.referenceTransactionId,
      status: entity.status as TransactionStatus,
      failureCode: entity.failureCode as FailureCode | undefined,
      resultBalanceAmount: entity.resultBalanceAmount,
      resultBalanceCurrency: entity.resultBalanceCurrency,
      attempts: entity.attempts,
      nextAttemptAt: entity.nextAttemptAt,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      processedAt: entity.processedAt,
    });
  }

  static toPersistence(domain: WagerTransaction): WagerTransactionEntity {
    const entity = new WagerTransactionEntity();
    entity.id = domain.id;
    entity.providerId = domain.providerId;
    entity.externalTransactionId = domain.externalTransactionId;
    entity.idempotencyKey = domain.idempotencyKey;
    entity.payloadHash = domain.payloadHash;
    entity.walletId = domain.walletId;
    entity.playerId = domain.playerId;
    entity.roundId = domain.roundId;
    entity.gameId = domain.gameId;
    entity.kind = domain.kind;
    entity.amount = domain.amount;
    entity.currency = domain.currency;
    entity.referenceExternalTransactionId = domain.referenceExternalTransactionId;
    entity.referenceTransactionId = domain.referenceTransactionId;
    entity.status = domain.status;
    entity.failureCode = domain.failureCode;
    entity.resultBalanceAmount = domain.resultBalanceAmount;
    entity.resultBalanceCurrency = domain.resultBalanceCurrency;
    entity.attempts = domain.attempts;
    entity.nextAttemptAt = domain.nextAttemptAt;
    entity.expiresAt = domain.expiresAt;
    entity.createdAt = domain.createdAt;
    entity.processedAt = domain.processedAt;
    
    return entity;
  }
}
