import 'zod-openapi/extend';

import { z } from 'zod';

export const SuccessResponseSchema = z.object({
  data: z.object({
    devboxName: z.string().openapi({
      description: 'Devbox name'
    }),
    tag: z.string().openapi({
      description: 'Release tag that was deleted'
    }),
    message: z.string().openapi({
      description: 'Success message'
    }),
    deletedAt: z.string().openapi({
      description: 'Deletion timestamp in ISO format'
    })
  })
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  error: z.any().optional()
});