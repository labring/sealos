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
  })
});

export const SuccessResponseSchema = z.object({
  data: z.object({
    devboxName: z.string().openapi({
      description: 'Devbox name'
    }),
    tag: z.string().openapi({
      description: 'Release tag'
    }),
    releaseDes: z.string().openapi({
      description: 'Release description'
    }),
    image: z.string().optional().openapi({
      description: 'Release image'
    }),
    createdAt: z.string().openapi({
      description: 'Release creation time'
    })
  })
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  error: z.any().optional()
});
