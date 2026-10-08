import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'wallets' })
@Unique({ properties: ['playerId', 'currency'] })
export class WalletEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'uuid', fieldName: 'player_id' })
  playerId!: string;

  @Property({ type: 'string', length: 3 })
  currency!: string;

  @Property({ type: 'decimal', precision: 18, scale: 2 })
  balance!: string;

  @Property({ type: 'integer', default: 1 })
  version!: number;

  @Property({ type: 'timestamptz', fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ type: 'timestamptz', fieldName: 'updated_at' })
  updatedAt!: Date;
}
