import { Migration } from '@mikro-orm/migrations';

export class Migration20261009120116 extends Migration {

  override name = 'Migration20261009120116';

  override up(): void | Promise<void> {
    this.addSql(`create table "wager_transactions" ("id" uuid not null, "provider_id" varchar(255) not null, "external_transaction_id" varchar(255) not null, "idempotency_key" varchar(255) not null, "payload_hash" varchar(255) not null, "wallet_id" uuid not null, "player_id" uuid not null, "round_id" varchar(255) not null, "game_id" varchar(255) not null, "kind" varchar(20) not null, "amount" numeric(18,2) not null, "currency" varchar(3) not null, "reference_external_transaction_id" varchar(255) null, "reference_transaction_id" uuid null, "status" varchar(30) not null, "failure_code" varchar(255) null, "result_balance_amount" numeric(18,2) null, "result_balance_currency" varchar(3) null, "attempts" int not null default 0, "next_attempt_at" timestamptz null, "expires_at" timestamptz null, "created_at" timestamptz not null, "processed_at" timestamptz null, primary key ("id"));`);
    this.addSql(`alter table "wager_transactions" add constraint "wager_transactions_idempotency_key_unique" unique ("idempotency_key");`);
    this.addSql(`alter table "wager_transactions" add constraint "wager_transactions_provider_id_external_transaction_id_unique" unique ("provider_id", "external_transaction_id");`);

    this.addSql(`create table "wallet_ledger_entries" ("id" uuid not null, "wallet_id" uuid not null, "transaction_id" uuid not null, "direction" varchar(10) not null, "amount" numeric(18,2) not null, "currency" varchar(3) not null, "balance_before_amount" numeric(18,2) not null, "balance_before_currency" varchar(3) not null, "balance_after_amount" numeric(18,2) not null, "balance_after_currency" varchar(3) not null, "created_at" timestamptz not null, primary key ("id"));`);

    this.addSql(`CREATE UNIQUE INDEX uq_reversal_reference_kind ON wager_transactions (reference_external_transaction_id, kind) WHERE kind IN ('REFUND', 'ROLLBACK');`);

    this.addSql(`ALTER TABLE wallet_ledger_entries ADD CONSTRAINT ck_ledger_amount_positive CHECK (amount > 0);`);
    this.addSql(`ALTER TABLE wallet_ledger_entries ADD CONSTRAINT ck_ledger_balance_before_non_negative CHECK (balance_before_amount >= 0);`);
    this.addSql(`ALTER TABLE wallet_ledger_entries ADD CONSTRAINT ck_ledger_balance_after_non_negative CHECK (balance_after_amount >= 0);`);
    this.addSql(`ALTER TABLE wallet_ledger_entries ADD CONSTRAINT ck_ledger_currencies_match CHECK (currency = balance_before_currency AND currency = balance_after_currency);`);
    this.addSql(`ALTER TABLE wallet_ledger_entries ADD CONSTRAINT ck_ledger_math CHECK (
      (direction = 'CREDIT' AND balance_after_amount = balance_before_amount + amount) OR
      (direction = 'DEBIT' AND balance_after_amount = balance_before_amount - amount)
    );`);

    this.addSql(`
      CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'Wallet ledger entries are append-only';
      END;
      $$ LANGUAGE plpgsql;
    `);
    this.addSql(`
      CREATE TRIGGER prevent_ledger_mutation_trigger
      BEFORE UPDATE OR DELETE ON wallet_ledger_entries
      FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
    `);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "wager_transactions" cascade;`);
    this.addSql(`drop table if exists "wallet_ledger_entries" cascade;`);
    this.addSql(`drop trigger if exists prevent_ledger_mutation_trigger on wallet_ledger_entries;`);
    this.addSql(`drop function if exists prevent_ledger_mutation();`);
  }

}
