import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { WalletLedgerEntryRepository } from '../../../../application/ports/repositories/wallet-ledger-entry.repository.js';
import { WalletLedgerEntry } from '../../../../domain/wallet/wallet-ledger-entry.js';
import { WalletLedgerEntryMapper } from '../../mappers/wallet-ledger-entry.mapper.js';

@Injectable()
export class MikroOrmWalletLedgerEntryRepository implements WalletLedgerEntryRepository {
  constructor(private readonly em: EntityManager) {}

  async save(entry: WalletLedgerEntry): Promise<void> {
    const entity = WalletLedgerEntryMapper.toPersistence(entry);
    this.em.persist(entity);
  }

  async calculateSumForWallet(walletId: string): Promise<string> {
    const connection = this.em.getConnection();
    const result = await connection.execute(
      'SELECT SUM(CASE WHEN direction = \'CREDIT\' THEN amount ELSE -amount END) as total FROM wallet_ledger_entries WHERE wallet_id = ?',
      [walletId]
    );
    return result[0]?.total?.toString() || '0.00';
  }
}
