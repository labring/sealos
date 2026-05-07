import { PrismaClient as CockroachPrismaClient } from 'prisma/generated/client';
import type { PrismaClient as PrismaClientType } from 'prisma/generated/client';
import { PrismaClient as PostgreSQLPrismaClient } from 'prisma/generated/postgresql-client';

const provider = (process.env.DATABASE_PROVIDER || 'cockroachdb').toLowerCase();
const isPostgreSQLProvider = ['postgresql', 'postgres', 'pg'].includes(provider);

const createPrismaClient = (): PrismaClientType => {
  if (isPostgreSQLProvider) {
    return new PostgreSQLPrismaClient({
      // log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
    }) as unknown as PrismaClientType;
  }

  return new CockroachPrismaClient({
    // log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  });
};
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined;
};

export const devboxDB = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = devboxDB;
}
