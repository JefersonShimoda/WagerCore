import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import mikroOrmConfig from './mikro-orm.config.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { envSchema } from './config/env.schema.js';
import { SqsModule } from './infrastructure/messaging/sqs/sqs.module.js';
import { HealthModule } from './health/health.module.js';

import { ScheduleModule } from '@nestjs/schedule';

import { WalletController } from './presentation/http/controllers/wallet.controller.js';
import { WagerTransactionController } from './presentation/http/controllers/wager-transaction.controller.js';

import { ProcessWagerTransactionUseCase } from './application/use-cases/process-wager-transaction.use-case.js';
import { CreateWalletUseCase } from './application/use-cases/create-wallet.use-case.js';
import { ReprocessPendingReferenceUseCase } from './application/use-cases/reprocess-pending-reference.use-case.js';
import { ReconcileWalletUseCase } from './application/use-cases/reconcile-wallet.use-case.js';

import { PendingReferenceScheduler } from './infrastructure/schedulers/pending-reference.scheduler.js';

import { MikroOrmWalletRepository } from './infrastructure/persistence/mikroorm/repositories/mikroorm-wallet.repository.js';
import { MikroOrmWagerTransactionRepository } from './infrastructure/persistence/mikroorm/repositories/mikroorm-wager-transaction.repository.js';
import { MikroOrmWalletLedgerEntryRepository } from './infrastructure/persistence/mikroorm/repositories/mikroorm-wallet-ledger-entry.repository.js';
import { MikroOrmInboxMessageRepository } from './infrastructure/persistence/mikroorm/repositories/mikroorm-inbox-message.repository.js';
import { MikroOrmOutboxMessageRepository } from './infrastructure/persistence/mikroorm/repositories/mikroorm-outbox-message.repository.js';
import { MikroOrmTransactionManager } from './infrastructure/persistence/mikroorm/mikroorm-transaction-manager.js';
import { SystemClock } from './infrastructure/clock/system-clock.js';

import { WalletRepository } from './application/ports/repositories/wallet.repository.js';
import { WagerTransactionRepository } from './application/ports/repositories/wager-transaction.repository.js';
import { WalletLedgerEntryRepository } from './application/ports/repositories/wallet-ledger-entry.repository.js';
import { InboxMessageRepository } from './application/ports/repositories/inbox-message.repository.js';
import { OutboxMessageRepository } from './application/ports/repositories/outbox-message.repository.js';
import { TransactionManager } from './application/ports/transaction-manager.port.js';
import { Clock } from './application/ports/clock/clock.port.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (config) => envSchema.parse(config),
    }),
    MikroOrmModule.forRoot(mikroOrmConfig),
    ScheduleModule.forRoot(),
    SqsModule,
    HealthModule,
  ],
  controllers: [AppController, WalletController, WagerTransactionController],
  providers: [
    AppService,
    // Use Cases
    ProcessWagerTransactionUseCase,
    CreateWalletUseCase,
    ReprocessPendingReferenceUseCase,
    ReconcileWalletUseCase,
    
    // Schedulers
    PendingReferenceScheduler,

    // Ports & Adapters
    { provide: WalletRepository, useClass: MikroOrmWalletRepository },
    { provide: WagerTransactionRepository, useClass: MikroOrmWagerTransactionRepository },
    { provide: WalletLedgerEntryRepository, useClass: MikroOrmWalletLedgerEntryRepository },
    { provide: InboxMessageRepository, useClass: MikroOrmInboxMessageRepository },
    { provide: OutboxMessageRepository, useClass: MikroOrmOutboxMessageRepository },
    { provide: TransactionManager, useClass: MikroOrmTransactionManager },
    { provide: Clock, useClass: SystemClock },
  ],
})
export class AppModule {}
