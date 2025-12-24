import 'zod-openapi/extend';

import { z } from 'zod';

export const RequestSchema = z.object({
  devboxName: z.string().min(1).openapi({
    description: 'Devbox name to start'
  }),
  onlyIngress: z.boolean().optional().default(false).openapi({
    description: 'Only modify ingress without changing devbox state'
  }),
  networkType: z.enum(['NodePort', 'Tailnet', 'SSHGate']).optional().openapi({
    description: 'Current network type of the devbox'
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
