import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('wager_transactions_total')
    public readonly transactionsTotal: Counter<string>,
    
    @InjectMetric('wager_duplicates_total')
    public readonly duplicatesTotal: Counter<string>,
    
    @InjectMetric('wager_retries_total')
    public readonly retriesTotal: Counter<string>,
    
    @InjectMetric('wager_dlq_messages_total')
    public readonly dlqMessagesTotal: Counter<string>,
    
    @InjectMetric('wager_lock_conflicts_total')
    public readonly lockConflictsTotal: Counter<string>,
    
    @InjectMetric('wager_outbox_lag')
    public readonly outboxLag: Gauge<string>,
    
    @InjectMetric('wager_processing_latency_seconds')
    public readonly processingLatency: Histogram<string>,
  ) {}
}
