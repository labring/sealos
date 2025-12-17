import * as z from 'zod';
import { dbDetailV1Schema } from '../../schemas/db';

export const pathParams = z.object({
  databaseName: z.string()
});

export const response = z.object({
  code: z.number(),
  message: z.string(),
  data: dbDetailV1Schema
});
