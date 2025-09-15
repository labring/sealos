import 'zod-openapi/extend';
import { z } from 'zod';

export const RequestSchema = z.object({}).openapi({
  description: 'Start devbox request body (empty)'
});

export const SuccessResponseSchema = z.object({
  data: z.string().default('success start devbox')
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  error: z.any().optional()
});