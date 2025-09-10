import * as z from 'zod';
import { dbEditSchema } from '../../schemas/db';

export const pathParams = z.object({
  databaseName: z.string()
});

export const body = dbEditSchema
  .pick({
    resource: true
  })
  .partial();

export const response = z.object({
  code: z.number(),
  message: z.string()
});
