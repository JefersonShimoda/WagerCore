import { Controller, Post, Body, UsePipes, HttpCode, HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import { ProcessWagerTransactionUseCase } from '../../../application/use-cases/process-wager-transaction.use-case.js';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe.js';
import { CanonicalPayloadHasher } from '../../../infrastructure/hashing/canonical-payload-hasher.js';
import { TransactionKind } from '../../../domain/transaction/wager-transaction.js';

const processWagerTransactionSchema = z.object({
  providerId: z.string().min(1),
  externalTransactionId: z.string().min(1),
  idempotencyKey: z.string().min(1).optional(),
  walletId: z.string().uuid(),
  playerId: z.string().min(1),
  roundId: z.string().min(1),
  gameId: z.string().min(1),
  kind: z.enum(['BET', 'WIN', 'REFUND', 'LOSS', 'ROLLBACK']),
  money: z.object({
    amount: z.string().regex(/^-?\d+\.\d{2}$/),
    currency: z.string().length(3),
  }),
  referenceExternalTransactionId: z.string().optional(),
});

export type ProcessWagerTransactionDto = z.infer<typeof processWagerTransactionSchema>;

@Controller('transactions')
export class WagerTransactionController {
  constructor(private readonly processUseCase: ProcessWagerTransactionUseCase) {}

  @Post('process')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(processWagerTransactionSchema))
  async processTransaction(@Body() dto: ProcessWagerTransactionDto) {
    const hasher = new CanonicalPayloadHasher();
    const payloadHash = hasher.hash(dto);

    const transaction = await this.processUseCase.execute({
      providerId: dto.providerId,
      externalTransactionId: dto.externalTransactionId,
      idempotencyKey: dto.idempotencyKey || dto.externalTransactionId,
      payloadHash,
      walletId: dto.walletId,
      playerId: dto.playerId,
      roundId: dto.roundId,
      gameId: dto.gameId,
      kind: dto.kind as TransactionKind,
      money: dto.money,
      referenceExternalTransactionId: dto.referenceExternalTransactionId,
    });

    return {
      id: transaction.id,
      status: transaction.status,
      resultBalanceAmount: transaction.resultBalanceAmount,
    };
  }
}
