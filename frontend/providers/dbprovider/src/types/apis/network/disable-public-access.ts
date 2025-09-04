import * as z from 'zod';

export const queryParams = z.object({
  name: z.string().min(1, 'Service name is required')
});

export const response = z.object({
  code: z.number(),
  message: z.string(),
  data: z.any().optional()
});
