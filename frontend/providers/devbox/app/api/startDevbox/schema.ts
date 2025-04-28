import 'zod-openapi/extend';

import { z } from 'zod';

export const RequestSchema = z.object({
  devboxName: z.string().min(1).openapi({
    description: 'Devbox name to start'
  })
});

export const SuccessResponseSchema = z.object({
  data: z.string().default('success start devbox').openapi({
    description: 'Start devbox success message'
  })
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  error: z.any().optional()
});
