import { PrismaClient as RegionPrismaClient } from 'prisma/region/generated/client';
import { PrismaClient as GlobalPrismaClient } from 'prisma/global/generated/client';
export const prisma = new RegionPrismaClient();
export const globalPrisma = new GlobalPrismaClient();
