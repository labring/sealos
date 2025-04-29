import 'zod-openapi/extend';

import { z } from 'zod';

export const RequestSchema = z.object({
  devboxName: z.string().min(1).openapi({
    description: 'Devbox name to restart'
  })
});

export const SuccessResponseSchema = z.object({
  data: z.string().default('success restart devbox').openapi({
    description: 'Restart devbox success message'
  })
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  error: z.any().optional()
});
