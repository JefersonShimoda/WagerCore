import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'wager_transactions' })
@Unique({ properties: ['providerId', 'externalTransactionId'] })
export class WagerTransactionEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'string', fieldName: 'provider_id' })
  providerId!: string;

  @Property({ type: 'string', fieldName: 'external_transaction_id' })
  externalTransactionId!: string;

  @Property({ type: 'string', unique: true, fieldName: 'idempotency_key' })
  idempotencyKey!: string;

  @Property({ type: 'string', fieldName: 'payload_hash' })
  payloadHash!: string;

  @Property({ type: 'uuid', fieldName: 'wallet_id' })
  walletId!: string;

  @Property({ type: 'uuid', fieldName: 'player_id' })
  playerId!: string;

  @Property({ type: 'string', fieldName: 'round_id' })
  roundId!: string;

  @Property({ type: 'string', fieldName: 'game_id' })
  gameId!: string;

  @Property({ type: 'string', length: 20 })
  kind!: string;

  @Property({ type: 'decimal', precision: 18, scale: 2 })
  amount!: string;

  @Property({ type: 'string', length: 3 })
  currency!: string;

  @Property({ type: 'string', nullable: true, fieldName: 'reference_external_transaction_id' })
  referenceExternalTransactionId?: string;

  @Property({ type: 'uuid', nullable: true, fieldName: 'reference_transaction_id' })
  referenceTransactionId?: string;

  @Property({ type: 'string', length: 30 })
  status!: string;

  @Property({ type: 'string', nullable: true, fieldName: 'failure_code' })
  failureCode?: string;

  @Property({ type: 'decimal', precision: 18, scale: 2, nullable: true, fieldName: 'result_balance_amount' })
  resultBalanceAmount?: string;

  @Property({ type: 'string', length: 3, nullable: true, fieldName: 'result_balance_currency' })
  resultBalanceCurrency?: string;

  @Property({ type: 'integer', default: 0 })
  attempts!: number;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'next_attempt_at' })
  nextAttemptAt?: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'expires_at' })
  expiresAt?: Date;

  @Property({ type: 'timestamptz', fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'processed_at' })
  processedAt?: Date;
}
