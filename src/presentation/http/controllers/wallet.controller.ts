import { Controller, Post, Body, UsePipes, HttpCode, HttpStatus, Param, ParseUUIDPipe } from '@nestjs/common';
import { z } from 'zod';
import { CreateWalletUseCase } from '../../../application/use-cases/create-wallet.use-case.js';
import { ReconcileWalletUseCase } from '../../../application/use-cases/reconcile-wallet.use-case.js';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe.js';

const createWalletSchema = z.object({
  playerId: z.string().min(1, 'Player ID is required'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
});

export type CreateWalletDto = z.infer<typeof createWalletSchema>;

@Controller('wallets')
export class WalletController {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly reconcileUseCase: ReconcileWalletUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createWalletSchema))
  async createWallet(@Body() dto: CreateWalletDto) {
    const walletId = await this.createWalletUseCase.execute({
      playerId: dto.playerId,
      currency: dto.currency,
    });

    return {
      id: walletId,
    };
  }

  @Post(':id/reconcile')
  @HttpCode(HttpStatus.OK)
  async reconcile(@Param('id', ParseUUIDPipe) id: string) {
    return this.reconcileUseCase.execute(id);
  }
}
