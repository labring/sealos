import * as z from 'zod';
import { dbTypeSchema } from '@/types/schemas/v2alpha/db';

export const body = z.object({
  backupName: z.string().min(1, 'Backup name is required'),
  dbName: z.string().min(1, 'Database name is required'),
  description: z.string().optional(),
  name: z.string().optional(),
  dbType: dbTypeSchema
});
