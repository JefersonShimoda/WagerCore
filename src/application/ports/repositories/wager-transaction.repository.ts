import { WagerTransaction } from '../../../domain/transaction/wager-transaction.js';

export abstract class WagerTransactionRepository {
  abstract findById(id: string): Promise<WagerTransaction | null>;
  abstract findByIdForUpdate(id: string): Promise<WagerTransaction | null>;
  abstract findByProviderAndExternalId(providerId: string, externalTransactionId: string): Promise<WagerTransaction | null>;
  abstract findByIdempotencyKey(idempotencyKey: string): Promise<WagerTransaction | null>;
  abstract findPendingReferenceIds(limit: number, now: Date): Promise<string[]>;
  abstract insertIdempotencyCheck(transaction: WagerTransaction): Promise<boolean>;
  abstract save(transaction: WagerTransaction): Promise<void>;
}
