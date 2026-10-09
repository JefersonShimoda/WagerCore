import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReprocessPendingReferenceUseCase } from '../../application/use-cases/reprocess-pending-reference.use-case.js';
import { WagerTransactionRepository } from '../../application/ports/repositories/wager-transaction.repository.js';
import { Clock } from '../../application/ports/clock/clock.port.js';

@Injectable()
export class PendingReferenceScheduler {
  private readonly logger = new Logger(PendingReferenceScheduler.name);

  constructor(
    private readonly reprocessUseCase: ReprocessPendingReferenceUseCase,
    private readonly wagerRepo: WagerTransactionRepository,
    private readonly clock: Clock,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handlePendingReferences() {
    this.logger.debug('Looking for PENDING_REFERENCE transactions...');
    const now = this.clock.now();
    const limit = 50;
    
    try {
      const transactionIds = await this.wagerRepo.findPendingReferenceIds(limit, now);
      if (transactionIds.length === 0) {
        return;
      }

      this.logger.debug(`Found ${transactionIds.length} PENDING_REFERENCE transactions to reprocess`);

      for (const id of transactionIds) {
        try {
          await this.reprocessUseCase.execute({ wagerTransactionId: id });
        } catch (e: any) {
          this.logger.error(`Error reprocessing wager transaction ${id}`, e.stack);
        }
      }
    } catch (e: any) {
      this.logger.error(`Failed to fetch pending references`, e.stack);
    }
  }
}
