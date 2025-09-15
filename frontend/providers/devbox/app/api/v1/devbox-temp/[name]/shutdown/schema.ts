import 'zod-openapi/extend';
import { z } from 'zod';

export const RequestSchema = z.object({}).openapi({
  description: 'Shutdown devbox request body (empty)'
});

export const SuccessResponseSchema = z.object({
  data: z.string().default('success shutdown devbox')
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  error: z.any().optional()
});
