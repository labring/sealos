import * as z from 'zod';
import { dbDetailSchema, dbEditSchema } from '../../schemas/db';

export const pathParams = z.object({});

export const response = z.object({
  code: z.number(),
  message: z.string(),
  data: z.array(dbDetailSchema)
});
