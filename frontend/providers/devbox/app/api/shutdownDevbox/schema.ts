import { z } from 'zod';

export const HeaderSchema = z.object({
  Authorization: z.string().describe('Use kubeconfig to login')
});

export const RequestSchema = z.object({
  devboxName: z.string().min(1).describe('Devbox name to shutdown'),
  shutdownMode: z
    .enum(['Stopped', 'Paused'] as const)
    .describe(
      'Shutdown mode: Pause is to shut down but not release the port, so it will still charge for the port fee; Stopped is to shut down and release the port, and will not continue to charge any fees'
    )
});

export const SuccessResponseSchema = z.object({
  data: z.string().default('success shutdown devbox')
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  error: z.any().optional()
});
