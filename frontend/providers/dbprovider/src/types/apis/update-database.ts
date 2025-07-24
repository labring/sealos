import * as z from 'zod';
import { dbEditSchema } from '../schemas/db';

export const pathParams = z.object({
  databaseName: z.string()
});

export const body = z.object({
  dbForm: dbEditSchema
    .pick({
      cpu: true,
      memory: true,
      replicas: true,
      storage: true,
      terminationPolicy: true
    })
    .partial()
});

export const response = z.object({
  code: z.number(),
  message: z.string()
});
