import * as z from 'zod';
import { dbDetailSchema } from '@/types/schemas/v2alpha/db';

export const pathParams = z.object({});

export const response = z.object({
  data: z.array(dbDetailSchema)
});
