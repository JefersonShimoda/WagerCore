import { v7 as uuidv7 } from 'uuid';
import { Money } from '../shared/money/money.js';
import { DomainError } from '../shared/errors/domain.error.js';

export type TransactionKind = 'OPENING' | 'BET' | 'WIN' | 'LOSS' | 'REFUND' | 'ROLLBACK';
export type TransactionStatus = 'PENDING' | 'PENDING_REFERENCE' | 'PROCESSED' | 'REJECTED' | 'FAILED';

export type FailureCode =
  | 'INSUFFICIENT_FUNDS'
  | 'REVERSAL_WOULD_OVERDRAW'
  | 'REFERENCE_NOT_FOUND'
  | 'INVALID_REFERENCE'
  | 'ALREADY_REVERSED'
  | 'CURRENCY_MISMATCH'
  | 'IDEMPOTENCY_CONFLICT'
  | 'WALLET_NOT_FOUND'
  | 'INVALID_TRANSACTION_STATE'
  | 'EXTERNAL_TRANSACTION_CONFLICT';

export interface WagerTransactionProps {
  id: string;
  providerId: string;
  externalTransactionId: string;
  idempotencyKey: string;
  payloadHash: string;
  walletId: string;
  playerId: string;
  roundId: string;
  gameId: string;
  kind: TransactionKind;
  amount: string;
  currency: string;
  referenceExternalTransactionId?: string;
  referenceTransactionId?: string;
  status: TransactionStatus;
  failureCode?: FailureCode;
  resultBalanceAmount?: string;
  resultBalanceCurrency?: string;
  attempts: number;
  nextAttemptAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  processedAt?: Date;
}

export class WagerTransaction {
  private constructor(private props: WagerTransactionProps) {}

  public get id(): string { return this.props.id; }
  public get providerId(): string { return this.props.providerId; }
  public get externalTransactionId(): string { return this.props.externalTransactionId; }
  public get idempotencyKey(): string { return this.props.idempotencyKey; }
  public get payloadHash(): string { return this.props.payloadHash; }
  public get walletId(): string { return this.props.walletId; }
  public get playerId(): string { return this.props.playerId; }
  public get roundId(): string { return this.props.roundId; }
  public get gameId(): string { return this.props.gameId; }
  public get kind(): TransactionKind { return this.props.kind; }
  public get amount(): string { return this.props.amount; }
  public get currency(): string { return this.props.currency; }
  public get referenceExternalTransactionId(): string | undefined { return this.props.referenceExternalTransactionId; }
  public get referenceTransactionId(): string | undefined { return this.props.referenceTransactionId; }
  public get status(): TransactionStatus { return this.props.status; }
  public get failureCode(): FailureCode | undefined { return this.props.failureCode; }
  public get resultBalanceAmount(): string | undefined { return this.props.resultBalanceAmount; }
  public get resultBalanceCurrency(): string | undefined { return this.props.resultBalanceCurrency; }
  public get attempts(): number { return this.props.attempts; }
  public get nextAttemptAt(): Date | undefined { return this.props.nextAttemptAt; }
  public get expiresAt(): Date | undefined { return this.props.expiresAt; }
  public get createdAt(): Date { return this.props.createdAt; }
  public get processedAt(): Date | undefined { return this.props.processedAt; }

  public get money(): Money {
    return Money.from({ amount: this.props.amount, currency: this.props.currency });
  }

  // Ensures we do not mutate a transaction that has reached a final state.
  private checkNotTerminal(): void {
    if (this.props.status === 'PROCESSED' || this.props.status === 'REJECTED' || this.props.status === 'FAILED') {
      throw new DomainError(`Cannot mutate transaction in terminal state: ${this.props.status}`);
    }
  }

  public markProcessed(now: Date, resultBalance?: Money): void {
    this.checkNotTerminal();
    this.props.status = 'PROCESSED';
    this.props.processedAt = now;
    if (resultBalance) {
      this.props.resultBalanceAmount = resultBalance.toJSON().amount;
      this.props.resultBalanceCurrency = resultBalance.currency;
    }
  }

  public markRejected(code: FailureCode, now: Date): void {
    this.checkNotTerminal();
    this.props.status = 'REJECTED';
    this.props.processedAt = now;
    this.props.failureCode = code;
  }

  public markFailed(now: Date): void {
    this.checkNotTerminal();
    this.props.status = 'FAILED';
    this.props.processedAt = now;
  }

  public markPendingReference(expiresAt: Date, nextAttemptAt: Date): void {
    if (this.props.status !== 'PENDING') {
      throw new DomainError(`Can only transition to PENDING_REFERENCE from PENDING, but is ${this.props.status}`);
    }
    this.props.status = 'PENDING_REFERENCE';
    this.props.attempts = 1;
    this.props.expiresAt = expiresAt;
    this.props.nextAttemptAt = nextAttemptAt;
  }

  public incrementAttempt(nextAttemptAt: Date): void {
    if (this.props.status !== 'PENDING_REFERENCE') {
      throw new DomainError('Can only increment attempt when PENDING_REFERENCE');
    }
    this.props.attempts += 1;
    this.props.nextAttemptAt = nextAttemptAt;
  }

  public linkReference(referenceTransactionId: string): void {
    if (this.props.status !== 'PENDING' && this.props.status !== 'PENDING_REFERENCE') {
      throw new DomainError('Cannot link reference in current state');
    }
    this.props.referenceTransactionId = referenceTransactionId;
  }

  public static createOpening(
    providerId: string,
    idempotencyKey: string,
    payloadHash: string,
    walletId: string,
    playerId: string,
    currency: string,
    now: Date,
  ): WagerTransaction {
    return new WagerTransaction({
      id: uuidv7(),
      providerId,
      externalTransactionId: `open-${walletId}`,
      idempotencyKey,
      payloadHash,
      walletId,
      playerId,
      roundId: 'opening',
      gameId: 'system',
      kind: 'OPENING',
      amount: '0.00',
      currency,
      status: 'PROCESSED',
      attempts: 0,
      createdAt: now,
      processedAt: now,
    });
  }

  public static createExternal(
    providerId: string,
    externalTransactionId: string,
    idempotencyKey: string,
    payloadHash: string,
    walletId: string,
    playerId: string,
    roundId: string,
    gameId: string,
    kind: TransactionKind,
    amount: string,
    currency: string,
    now: Date,
    referenceExternalTransactionId?: string,
  ): WagerTransaction {
    if (kind === 'OPENING') {
      throw new DomainError('OPENING cannot be created as external transaction');
    }

    if ((kind === 'REFUND' || kind === 'ROLLBACK') && !referenceExternalTransactionId) {
      throw new DomainError(`${kind} requires referenceExternalTransactionId`);
    }

    if ((kind === 'BET' || kind === 'LOSS') && referenceExternalTransactionId) {
      throw new DomainError(`${kind} must not contain a reference`);
    }

    return new WagerTransaction({
      id: uuidv7(),
      providerId,
      externalTransactionId,
      idempotencyKey,
      payloadHash,
      walletId,
      playerId,
      roundId,
      gameId,
      kind,
      amount,
      currency,
      status: 'PENDING',
      attempts: 0,
      referenceExternalTransactionId,
      createdAt: now,
    });
  }

  public static rehydrate(props: WagerTransactionProps): WagerTransaction {
    return new WagerTransaction(props);
  }
}
