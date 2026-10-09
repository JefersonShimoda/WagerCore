import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'wallet_ledger_entries' })
export class WalletLedgerEntryEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'uuid', fieldName: 'wallet_id' })
  walletId!: string;

  @Property({ type: 'uuid', fieldName: 'transaction_id' })
  transactionId!: string;

  @Property({ type: 'string', length: 10 })
  direction!: string;

  @Property({ type: 'decimal', precision: 18, scale: 2, fieldName: 'amount' })
  amount!: string;

  @Property({ type: 'string', length: 3, fieldName: 'currency' })
  currency!: string;

  @Property({ type: 'decimal', precision: 18, scale: 2, fieldName: 'balance_before_amount' })
  balanceBeforeAmount!: string;

  @Property({ type: 'string', length: 3, fieldName: 'balance_before_currency' })
  balanceBeforeCurrency!: string;

  @Property({ type: 'decimal', precision: 18, scale: 2, fieldName: 'balance_after_amount' })
  balanceAfterAmount!: string;

  @Property({ type: 'string', length: 3, fieldName: 'balance_after_currency' })
  balanceAfterCurrency!: string;

  @Property({ type: 'timestamptz', fieldName: 'created_at' })
  createdAt!: Date;
}
