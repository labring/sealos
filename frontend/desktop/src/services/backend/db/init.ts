import { PrismaClient as RegionPrismaClient } from 'prisma/region/generated/client';
import { PrismaClient as GlobalPrismaClient } from 'prisma/global/generated/client';

const globalForPrisma = global as unknown as {
  prisma: RegionPrismaClient | undefined;
  globalPrisma: GlobalPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new RegionPrismaClient();
export const globalPrisma = globalForPrisma.globalPrisma ?? new GlobalPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.globalPrisma = globalPrisma;
}
