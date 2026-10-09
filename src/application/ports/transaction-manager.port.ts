export abstract class TransactionManager {
  abstract transactional<T>(work: () => Promise<T>): Promise<T>;
}
