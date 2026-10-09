import { WalletLedgerEntry } from '../../../domain/wallet/wallet-ledger-entry.js';

export abstract class WalletLedgerEntryRepository {
  abstract save(entry: WalletLedgerEntry): Promise<void>;
}
