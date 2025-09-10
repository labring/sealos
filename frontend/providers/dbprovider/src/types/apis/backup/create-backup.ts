import * as z from 'zod';
import { dbTypeSchema } from '../../schemas/db';

export const body = z.object({
  backupName: z.string().min(1, 'Backup name is required'),
  dbName: z.string().min(1, 'Database name is required'),
  remark: z.string().optional(),
  dbType: dbTypeSchema
});

export const response = z.object({
  code: z.number(),
  message: z.string()
});
