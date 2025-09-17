import * as z from 'zod';

export const body = z.object({}).optional();

export const response = z.object({
  code: z.number(),
  message: z.string(),
  data: z
    .object({
      dbName: z.string(),
      serviceName: z.string(),
      operation: z.literal('enable-public-access'),
      nodePort: z.number().optional(),
      createdAt: z.string()
    })
    .optional()
});
