import { Global, Module } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider, makeGaugeProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service.js';
import { OutboxMetricsScheduler } from './outbox-metrics.scheduler.js';

@Global()
@Module({
  imports: [PrometheusModule.register()],
  providers: [
    MetricsService,
    OutboxMetricsScheduler,
    makeCounterProvider({
      name: 'wager_transactions_total',
      help: 'Total number of wager transactions processed by status',
      labelNames: ['status', 'kind'],
    }),
    makeCounterProvider({
      name: 'wager_duplicates_total',
      help: 'Total number of duplicate transactions detected (idempotency hits)',
    }),
    makeCounterProvider({
      name: 'wager_retries_total',
      help: 'Total number of transient retries (e.g. references not found, connection issues)',
    }),
    makeCounterProvider({
      name: 'wager_dlq_messages_total',
      help: 'Total number of messages that failed permanently and routed to DLQ',
    }),
    makeCounterProvider({
      name: 'wager_lock_conflicts_total',
      help: 'Total number of pessimistic lock conflicts encountered',
    }),
    makeGaugeProvider({
      name: 'wager_outbox_lag',
      help: 'Current number of pending outbox messages',
    }),
    makeHistogramProvider({
      name: 'wager_processing_latency_seconds',
      help: 'Processing latency in seconds',
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    }),
  ],
  exports: [MetricsService],
})
export class ObservabilityModule {}
