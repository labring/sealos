import * as z from 'zod';
import { backupItemSchema, dbEditSchema } from '../schemas/db';

export const body = z.object({
  dbForm: dbEditSchema,
  backupInfo: z.optional(backupItemSchema)
});

export const response = z.object({
  code: z.number(),
  message: z.string()
});
