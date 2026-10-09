import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { v7 as uuidv7 } from 'uuid';
import { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';
import { ReprocessPendingReferenceUseCase } from '../src/application/use-cases/reprocess-pending-reference.use-case.js';

describe('Out of Order Reference (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: any;
  let reprocessUseCase: ReprocessPendingReferenceUseCase;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer();
    reprocessUseCase = app.get(ReprocessPendingReferenceUseCase);
  });

  afterAll(async () => {
    await app.close();
  });

  it('Should handle REFUND delivered before BET', async () => {
    const playerId = uuidv7();
    const walletRes = await request(httpServer)
      .post('/wallets')
      .send({ playerId, currency: 'USD' })
      .expect(201);
    
    const walletId = walletRes.body.id;

    // Credit initially
    await request(httpServer)
      .post('/transactions/process')
      .send({
        providerId: 'provider-test',
        externalTransactionId: `ext-dep-${uuidv7()}`,
        idempotencyKey: uuidv7(),
        payloadHash: 'hash',
        walletId,
        playerId,
        roundId: 'round-1',
        gameId: 'game-1',
        kind: 'WIN',
        money: { amount: '100.00', currency: 'USD' }
      })
      .expect(200);

    const refTransactionId = `bet-${uuidv7()}`;

    // 1. REFUND comes BEFORE BET
    const refundRes = await request(httpServer)
      .post('/transactions/process')
      .send({
        providerId: 'provider-test',
        externalTransactionId: `refund-${uuidv7()}`,
        idempotencyKey: uuidv7(),
        payloadHash: 'hash-ref',
        walletId,
        playerId,
        roundId: 'round-1',
        gameId: 'game-1',
        kind: 'REFUND',
        money: { amount: '10.00', currency: 'USD' },
        referenceExternalTransactionId: refTransactionId
      })
      .expect(200);

    expect(refundRes.body.status).toBe('PENDING_REFERENCE');

    // 2. The BET arrives later
    await request(httpServer)
      .post('/transactions/process')
      .send({
        providerId: 'provider-test',
        externalTransactionId: refTransactionId,
        idempotencyKey: uuidv7(),
        payloadHash: 'hash-bet',
        walletId,
        playerId,
        roundId: 'round-1',
        gameId: 'game-1',
        kind: 'BET',
        money: { amount: '10.00', currency: 'USD' }
      })
      .expect(200);

    // 3. Trigger worker
    await reprocessUseCase.execute({ wagerTransactionId: refundRes.body.id });

    // 4. Verify refund is now processed and balance is correct (100 - 10 + 10 = 100)
    const reconcileRes = await request(httpServer)
      .post(`/wallets/${walletId}/reconcile`)
      .expect(200);

    expect(reconcileRes.body.walletBalance).toBe('100.00');
    expect(reconcileRes.body.isBalanced).toBe(true);
  });
});
