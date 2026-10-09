export class WalletBalanceChanged {
  constructor(
    public readonly walletId: string,
    public readonly playerId: string,
    public readonly currency: string,
    public readonly balanceAmount: string,
    public readonly version: number,
  ) {}
}

export class WagerTransactionProcessed {
  constructor(
    public readonly transactionId: string,
    public readonly walletId: string,
    public readonly kind: string,
    public readonly resultBalanceAmount: string,
    public readonly currency: string,
  ) {}
}

export class WagerTransactionRejected {
  constructor(
    public readonly transactionId: string,
    public readonly failureCode: string,
  ) {}
}

export class WagerTransactionPendingReference {
  constructor(
    public readonly transactionId: string,
    public readonly referenceExternalTransactionId: string,
  ) {}
}
