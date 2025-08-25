import * as z from 'zod';
import { dbDetailSchema, dbEditSchema } from '../../schemas/db';

export const body = dbEditSchema;

export const response = z.object({
  code: z.number(),
  message: z.string(),
  data: dbDetailSchema
});
