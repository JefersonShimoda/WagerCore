export abstract class PayloadHasher {
  abstract hash(payload: any): string;
}
