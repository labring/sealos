import * as z from 'zod';

export const pathParams = z.object({
  databaseName: z.string()
});

export const response = z.object({
  code: z.number(),
  message: z.string()
});
