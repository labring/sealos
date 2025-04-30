import 'zod-openapi/extend';

import { z } from 'zod';

export const RequestSchema = z.object({
  devboxName: z.string().min(1).openapi({
    description: 'Devbox name'
  })
});

export const SuccessResponseSchema = z.object({
  data: z
    .array(
      z.object({
        id: z.string().openapi({
          description: 'Version ID'
        }),
        name: z.string().openapi({
          description: 'Version name'
        }),
        devboxName: z.string().openapi({
          description: 'Devbox name'
        }),
        createTime: z.string().openapi({
          description: 'Creation time in YYYY-MM-DD HH:mm format'
        }),
        tag: z.string().openapi({
          description: 'Version tag'
        }),
        status: z
          .object({
            value: z.string().openapi({
              description: 'Status value'
            }),
            label: z.string().openapi({
              description: 'Status label'
            })
          })
          .openapi({
            description: 'Version status'
          }),
        description: z.string().openapi({
          description: 'Version description'
        })
      })
    )
    .openapi({
      description: 'List of devbox versions'
    })
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  error: z.any().optional()
});
