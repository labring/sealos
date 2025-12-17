import 'zod-openapi/extend';

import { z } from 'zod';

export const GetSuccessResponseSchema = z
  .array(
    z.object({
      name: z.string().openapi({
        description: 'Deployment or StatefulSet name'
      }),
      resourceType: z.enum(['deployment', 'statefulset']).openapi({
        description: 'Resource type'
      }),
      tag: z.string().openapi({
        description: 'Devbox tag extracted from image name'
      })
    })
  )
  .openapi({
    description: 'List of deployed devbox releases'
  });

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  error: z.any().optional()
});