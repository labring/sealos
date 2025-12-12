import 'zod-openapi/extend';
import { z } from 'zod';

export const RequestSchema = z.object({
  devboxName: z.string().min(1),
  port: z.number().min(1).max(65535)
});

export const SuccessResponseSchema = z.object({
  data: z.object({
    publicDomain: z.string()
  })
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  error: z.any().optional()
});
