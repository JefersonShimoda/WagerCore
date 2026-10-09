import { Injectable } from '@nestjs/common';
import { WalletRepository } from '../ports/repositories/wallet.repository.js';
import { WalletLedgerEntryRepository } from '../ports/repositories/wallet-ledger-entry.repository.js';
import { Decimal } from 'decimal.js';

export interface ReconcileWalletResult {
  walletId: string;
  isBalanced: boolean;
  walletBalance: string;
  ledgerSum: string;
  difference: string;
}

@Injectable()
export class ReconcileWalletUseCase {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly ledgerRepo: WalletLedgerEntryRepository,
  ) {}

  async execute(walletId: string): Promise<ReconcileWalletResult> {
    const wallet = await this.walletRepo.findById(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const ledgerSumStr = await this.ledgerRepo.calculateSumForWallet(walletId);
    
    const walletBalance = new Decimal(wallet.balance.toJSON().amount);
    const ledgerSum = new Decimal(ledgerSumStr || '0');
    
    const difference = walletBalance.minus(ledgerSum);
    const isBalanced = difference.isZero();

    return {
      walletId: wallet.id,
      isBalanced,
      walletBalance: walletBalance.toFixed(2),
      ledgerSum: ledgerSum.toFixed(2),
      difference: difference.toFixed(2),
    };
  }
}
