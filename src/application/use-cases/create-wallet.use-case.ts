import { Injectable } from '@nestjs/common';
import { WalletRepository } from '../ports/repositories/wallet.repository.js';
import { Wallet } from '../../domain/wallet/wallet.js';
import { Money } from '../../domain/shared/money/money.js';
import { DomainError } from '../../domain/shared/errors/domain.error.js';
import { Clock } from '../ports/clock/clock.port.js';

export interface CreateWalletCommand {
  playerId: string;
  currency: string;
}

@Injectable()
export class CreateWalletUseCase {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: CreateWalletCommand): Promise<string> {
    const existing = await this.walletRepository.findByPlayerAndCurrency(command.playerId, command.currency);
    if (existing) {
      return existing.id; // Idempotent open
    }

    const wallet = Wallet.open({
      playerId: command.playerId,
      currency: command.currency,
      balance: Money.zero(command.currency),
      now: this.clock.now()
    });
    await this.walletRepository.save(wallet);

    return wallet.id;
  }
}
