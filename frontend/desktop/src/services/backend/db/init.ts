import { PrismaClient as RegionPrismaClient } from 'prisma/region/generated/client';
import { PrismaClient as GlobalPrismaClient } from 'prisma/global/generated/client';

export const prisma = global.prisma ?? new RegionPrismaClient();
export const globalPrisma = global.globalPrisma ?? new GlobalPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
  global.globalPrisma = globalPrisma;
}
