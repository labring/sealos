import 'zod-openapi/extend';

import { z } from 'zod';


export const RequestSchema = z.object({
  tag: z.string().min(1).openapi({
    description: 'Release tag'
  }),
  releaseDes: z.string().optional().default('').openapi({
    description: 'Release description'
  }),
  execCommand: z.string().optional().openapi({
    description: 'Command to execute in the devbox after release restart (autostart)',
    example: 'nohup /home/devbox/project/entrypoint.sh > /dev/null 2>&1 &'
  }),
  startDevboxAfterRelease: z.boolean().optional().default(false).openapi({
    description: 'Start devbox automatically after release'
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

export const GetSuccessResponseSchema = z
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
      createdAt: z.string().openapi({
        description: 'Creation time in YYYY-MM-DD HH:mm format'
      }),
      tag: z.string().openapi({
        description: 'Version tag'
      }),
      description: z.string().openapi({
        description: 'Version description'
      }),
      image: z.string().openapi({
        description: 'Release image address'
      })
    })
  )
  .openapi({
    description: 'List of devbox versions'
  });

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  error: z.any().optional()
});