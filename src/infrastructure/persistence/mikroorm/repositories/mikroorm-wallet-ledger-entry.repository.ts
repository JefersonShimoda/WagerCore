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
}
