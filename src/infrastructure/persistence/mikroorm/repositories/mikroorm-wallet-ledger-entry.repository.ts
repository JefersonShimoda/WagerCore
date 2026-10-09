import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { WalletLedgerEntryRepository } from '../../../../application/ports/repositories/wallet-ledger-entry.repository.js';
import { WalletLedgerEntry } from '../../../../domain/wallet/wallet-ledger-entry.js';
import { WalletLedgerEntryMapper } from '../../mappers/wallet-ledger-entry.mapper.js';

import { WalletLedgerEntryEntity } from '../entities/wallet-ledger-entry.entity.js';

@Injectable()
export class MikroOrmWalletLedgerEntryRepository implements WalletLedgerEntryRepository {
  constructor(private readonly em: EntityManager) {}

  async save(entry: WalletLedgerEntry): Promise<void> {
    const entity = WalletLedgerEntryMapper.toPersistence(entry);
    this.em.persist(entity);
  }

  async calculateSumForWallet(walletId: string): Promise<string> {
    const qb = this.em.createQueryBuilder(WalletLedgerEntryEntity);
    const result = await qb
      .select('SUM(CASE WHEN direction = \'CREDIT\' THEN amount ELSE -amount END) as total')
      .where({ walletId })
      .execute('get');
    return (result as any)?.total?.toString() || '0.00';
  }
}
