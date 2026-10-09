import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

import { DatabaseHealthIndicator } from './database.health.js';
import { SqsHealthIndicator } from './sqs.health.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
    private readonly sqs: SqsHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.checkReadiness();
  }

  @Get('liveness')
  @HealthCheck()
  checkLiveness() {
    return this.health.check([]);
  }

  @Get('readiness')
  @HealthCheck()
  checkReadiness() {
    return this.health.check([
      () => this.database.isHealthy('database'),
      () => this.sqs.isHealthy('sqs'),
    ]);
  }
}
