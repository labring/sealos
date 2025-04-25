import { z } from 'zod';

export const HeaderSchema = z.object({
  Authorization: z.string().describe('Use kubeconfig to login')
});

export const RequestSchema = z.object({
  devboxName: z.string().min(1).describe('Devbox name to delete')
});

export const SuccessResponseSchema = z.object({
  data: z.string().default('success delete devbox')
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  error: z.any().optional()
});
