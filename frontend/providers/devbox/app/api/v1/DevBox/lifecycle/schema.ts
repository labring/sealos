import 'zod-openapi/extend';
import { z } from 'zod';

export const RequestSchema = z.object({
  devboxName: z.string().min(1).openapi({
    description: 'Devbox name'
  }),
  action: z.enum(['start', 'stop', 'restart', 'shutdown']).openapi({
    description:
      'The action to perform on the devbox.Note: stop is to shut down and not release the port, and will continue to charge port fees(a little bit); shutdown is to shut down and release the port, and will not continue to charge any fees'
  })
});

export const SuccessResponseSchema = z.object({
  data: z.string().default('success modify devbox status')
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  error: z.any().optional()
});
