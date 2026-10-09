import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'inbox_messages' })
export class InboxMessageEntity {
  // Key is (consumerName, messageId), MikroORM composite PK
  @PrimaryKey({ type: 'string', length: 100, fieldName: 'consumer_name' })
  consumerName!: string;

  @PrimaryKey({ type: 'string', length: 100, fieldName: 'message_id' })
  messageId!: string;

  @Property({ type: 'string', length: 255, fieldName: 'payload_hash' })
  payloadHash!: string;

  @Property({ type: 'timestamptz', fieldName: 'received_at' })
  receivedAt!: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'processed_at' })
  processedAt?: Date;
}
