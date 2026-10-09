import { Wallet } from '../../../domain/wallet/wallet.js';

export abstract class WalletRepository {
  abstract findById(id: string): Promise<Wallet | null>;
  abstract findByPlayerAndCurrency(playerId: string, currency: string): Promise<Wallet | null>;
  abstract findByIdForUpdate(id: string): Promise<Wallet | null>;
  abstract save(wallet: Wallet): Promise<void>;
}
