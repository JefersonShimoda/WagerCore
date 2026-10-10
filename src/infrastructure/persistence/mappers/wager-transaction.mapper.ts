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

  static toPersistence(domain: WagerTransaction): any {
    return {
      id: domain.id,
      providerId: domain.providerId,
      externalTransactionId: domain.externalTransactionId,
      idempotencyKey: domain.idempotencyKey,
      payloadHash: domain.payloadHash,
      walletId: domain.walletId,
      playerId: domain.playerId,
      roundId: domain.roundId,
      gameId: domain.gameId,
      kind: domain.kind,
      amount: domain.amount,
      currency: domain.currency,
      referenceExternalTransactionId: domain.referenceExternalTransactionId,
      referenceTransactionId: domain.referenceTransactionId,
      status: domain.status,
      failureCode: domain.failureCode,
      resultBalanceAmount: domain.resultBalanceAmount,
      resultBalanceCurrency: domain.resultBalanceCurrency,
      attempts: domain.attempts,
      nextAttemptAt: domain.nextAttemptAt,
      expiresAt: domain.expiresAt,
      createdAt: domain.createdAt,
      processedAt: domain.processedAt,
    };
  }
}
