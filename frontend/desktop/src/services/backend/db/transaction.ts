import { Prisma } from 'prisma/global/generated/client';
import { globalPrisma } from './init';

const MAX_TRANSACTION_RETRIES = 3;

const isTransactionWriteConflict = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034';

export async function withSerializableTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  for (let attempt = 0; attempt < MAX_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await globalPrisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      if (isTransactionWriteConflict(error) && attempt < MAX_TRANSACTION_RETRIES - 1) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Transaction retry limit exceeded');
}
