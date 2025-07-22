import * as z from 'zod';

export const pathParams = z.object({
  instanceName: z.string()
});

export const response = z.object({
  code: z.number(),
  message: z.string()
});
