import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { v7 as uuidv7 } from 'uuid';
import { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';

describe('Concurrency (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  const player1Id = uuidv7();
  const player2Id = uuidv7();

  it('Should handle concurrent identical requests via idempotency (only process once)', async () => {
    // 1. Create a wallet
    const createWalletRes = await request(httpServer)
      .post('/wallets')
      .send({ playerId: player1Id, currency: 'USD' })
      .expect(201);
    
    const walletId = createWalletRes.body.id;
    
    // Deposit money first (WIN)
    const depositIdempotency = uuidv7();
    const depositHash = 'mock-hash-deposit';
    await request(httpServer)
      .post('/transactions/process')
      .send({
        providerId: 'provider-1',
        externalTransactionId: `ext-dep-${uuidv7()}`,
        idempotencyKey: depositIdempotency,
        payloadHash: depositHash,
        walletId: walletId,
        playerId: player1Id,
        roundId: 'round-1',
        gameId: 'game-1',
        kind: 'WIN',
        money: { amount: '100.00', currency: 'USD' }
      })
      .expect(200);

    // 2. Prepare 50 identical BET requests
    const idempotencyKey = uuidv7();
    const payloadHash = 'mock-hash';
    const payload = {
      providerId: 'provider-1',
      externalTransactionId: `ext-${uuidv7()}`,
      idempotencyKey,
      payloadHash,
      walletId,
      playerId: player1Id,
      roundId: 'round-1',
      gameId: 'game-1',
      kind: 'BET',
      money: { amount: '10.00', currency: 'USD' }
    };

    const requests = Array.from({ length: 50 }).map(() => 
      request(httpServer).post('/transactions/process').send(payload)
    );

    const responses = await Promise.all(requests);
    
    // They should all return 200 (since idempotency replay returns the processed txn)
    responses.forEach(res => {
      expect(res.status).toBe(200);
    });

    // 3. Reconcile to verify the balance is 90.00
    const reconcileRes = await request(httpServer)
      .post(`/wallets/${walletId}/reconcile`)
      .expect(200);

    expect(reconcileRes.body.walletBalance).toBe('90.00');
    expect(reconcileRes.body.ledgerSum).toBe('90.00');
    expect(reconcileRes.body.isBalanced).toBe(true);
  });

  it('Should handle concurrent different requests properly (Pessimistic Locking)', async () => {
    // 1. Create a wallet
    const createWalletRes = await request(httpServer)
      .post('/wallets')
      .send({ playerId: player2Id, currency: 'USD' })
      .expect(201);
    
    const walletId = createWalletRes.body.id;

    // Deposit 100.00
    await request(httpServer)
      .post('/transactions/process')
      .send({
        providerId: 'provider-1',
        externalTransactionId: `ext-dep-${uuidv7()}`,
        idempotencyKey: uuidv7(),
        payloadHash: 'hash-dep-2',
        walletId: walletId,
        playerId: player2Id,
        roundId: 'round-1',
        gameId: 'game-1',
        kind: 'WIN',
        money: { amount: '100.00', currency: 'USD' }
      })
      .expect(200);

    // 2. Prepare 50 DIFFERENT BET requests of 1.00 each
    const requests = Array.from({ length: 50 }).map((_, index) => {
      return request(httpServer).post('/transactions/process').send({
        providerId: 'provider-1',
        externalTransactionId: `ext-bet-${uuidv7()}`,
        idempotencyKey: uuidv7(),
        payloadHash: `hash-bet-${index}`,
        walletId,
        playerId: player2Id,
        roundId: 'round-1',
        gameId: 'game-1',
        kind: 'BET',
        money: { amount: '1.00', currency: 'USD' }
      });
    });

    const responses = await Promise.all(requests);
    
    // They should all succeed
    responses.forEach(res => {
      expect(res.status).toBe(200);
    });

    // 3. Reconcile to verify the balance is 50.00 (100 - 10 * 5)
    const reconcileRes = await request(httpServer)
      .post(`/wallets/${walletId}/reconcile`)
      .expect(200);

    expect(reconcileRes.body.walletBalance).toBe('50.00');
    expect(reconcileRes.body.ledgerSum).toBe('50.00');
    expect(reconcileRes.body.isBalanced).toBe(true);
  });
});
