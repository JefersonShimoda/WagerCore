import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { TransactionManager } from '../../../application/ports/transaction-manager.port.js';

@Injectable()
export class MikroOrmTransactionManager implements TransactionManager {
  constructor(private readonly em: EntityManager) {}

  async transactional<T>(work: () => Promise<T>): Promise<T> {
    return this.em.transactional(async () => {
      return await work();
    });
  }
}
