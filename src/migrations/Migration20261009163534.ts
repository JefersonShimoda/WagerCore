import { Migration } from '@mikro-orm/migrations';

export class Migration20261009163534 extends Migration {

  override name = 'Migration20261009163534';

  override up(): void | Promise<void> {
    this.addSql(`create table "inbox_messages" ("consumer_name" varchar(100) not null, "message_id" varchar(100) not null, "payload_hash" varchar(255) not null, "received_at" timestamptz not null, "processed_at" timestamptz null, primary key ("consumer_name", "message_id"));`);

    this.addSql(`create table "outbox_messages" ("id" uuid not null, "event_id" uuid not null, "aggregate_id" uuid not null, "event_type" varchar(100) not null, "version" int not null, "correlation_id" varchar(100) not null, "causation_id" varchar(100) null, "payload" jsonb not null, "occurred_at" timestamptz not null, "attempts" int not null default 0, "next_attempt_at" timestamptz null, "lease_until" timestamptz null, "status" varchar(20) not null, "published_at" timestamptz null, "last_error" text null, primary key ("id"));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "inbox_messages" cascade;`);
    this.addSql(`drop table if exists "outbox_messages" cascade;`);
  }

}
