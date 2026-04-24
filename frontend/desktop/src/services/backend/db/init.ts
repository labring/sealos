import {
  PrismaClient as CockroachRegionPrismaClient,
  type PrismaClient as RegionPrismaClientType
} from 'prisma/region/generated/client';
import { PrismaClient as PostgresqlRegionPrismaClient } from 'prisma/providers/postgresql/region/generated/client';
import {
  PrismaClient as CockroachGlobalPrismaClient,
  type PrismaClient as GlobalPrismaClientType
} from 'prisma/global/generated/client';
import { PrismaClient as PostgresqlGlobalPrismaClient } from 'prisma/providers/postgresql/global/generated/client';

const usePostgresql = process.env.PRISMA_DB_PROVIDER === 'postgresql';

const globalForPrisma = globalThis as {
  prisma?: RegionPrismaClientType;
  globalPrisma?: GlobalPrismaClientType;
};

export const prisma =
  globalForPrisma.prisma ??
  (usePostgresql
    ? (new PostgresqlRegionPrismaClient() as unknown as RegionPrismaClientType)
    : new CockroachRegionPrismaClient());

export const globalPrisma =
  globalForPrisma.globalPrisma ??
  (usePostgresql
    ? (new PostgresqlGlobalPrismaClient() as unknown as GlobalPrismaClientType)
    : new CockroachGlobalPrismaClient());

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.globalPrisma = globalPrisma;
}
