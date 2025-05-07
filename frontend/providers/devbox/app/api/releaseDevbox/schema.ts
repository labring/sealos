import 'zod-openapi/extend';

import { z } from 'zod';

export const RequestSchema = z.object({
  devboxName: z.string().min(1).openapi({
    description: 'Devbox name'
  }),
  tag: z.string().min(1).openapi({
    description: 'Release tag'
  }),
  releaseDes: z.string().optional().default('').openapi({
    description: 'Release description'
  }),
  devboxUid: z.string().min(1).openapi({
    description: 'Devbox UID'
  })
});

export const SuccessResponseSchema = z.object({
  data: z.string().default('success')
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  error: z.any().optional()
});
