export interface InboxMessageProps {
  consumerName: string;
  messageId: string;
  payloadHash: string;
  receivedAt: Date;
  processedAt?: Date;
}

export class InboxMessage {
  private constructor(private readonly props: InboxMessageProps) {}

  get consumerName(): string { return this.props.consumerName; }
  get messageId(): string { return this.props.messageId; }
  get payloadHash(): string { return this.props.payloadHash; }
  get receivedAt(): Date { return this.props.receivedAt; }
  get processedAt(): Date | undefined { return this.props.processedAt; }

  static receive(consumerName: string, messageId: string, payloadHash: string, now: Date): InboxMessage {
    return new InboxMessage({
      consumerName,
      messageId,
      payloadHash,
      receivedAt: now,
    });
  }

  markProcessed(now: Date): void {
    if (this.props.processedAt) {
      throw new Error('Inbox message is already processed');
    }
    this.props.processedAt = now;
  }

  static rehydrate(props: InboxMessageProps): InboxMessage {
    return new InboxMessage(props);
  }
}
