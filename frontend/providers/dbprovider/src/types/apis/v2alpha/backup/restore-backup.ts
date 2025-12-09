import * as z from 'zod';
import {
  dbTypeSchema,
  allResourceSchema,
  kubeBlockClusterTerminationPolicySchema
} from '@/types/schemas/v2alpha/db';

export const body = z.object({
  backupName: z.string().min(1, 'Backup name is required'),
  dbName: z.string().min(1, 'Database name is required'),
  name: z.string().min(1, 'New database name is required'),
  dbType: dbTypeSchema,
  version: z.string().min(1, 'Database version is required'),
  resource: allResourceSchema,
  terminationPolicy: kubeBlockClusterTerminationPolicySchema
});
