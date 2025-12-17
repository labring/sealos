import * as z from 'zod';
import { dbTypeSchema } from '../../schemas/db';
import { allResourceSchema } from '../../schemas/db';
import { kubeBlockClusterTerminationPolicySchema } from '../../schemas/db';

export const body = z.object({
  backupName: z.string().min(1, 'Backup name is required'),
  dbName: z.string().min(1, 'Database name is required'),
  newDbName: z.string().min(1, 'New database name is required'),
  dbType: dbTypeSchema,
  version: z.string().min(1, 'Database version is required'),
  resource: allResourceSchema,
  terminationPolicy: kubeBlockClusterTerminationPolicySchema
});

export const response = z.object({
  code: z.number(),
  message: z.string()
});
