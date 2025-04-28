import 'zod-openapi/extend';

import { z } from 'zod';

export const ReleaseAndDeployDevboxRequestSchema = z.object({
  devboxName: z.string().openapi({
    description: 'Devbox name'
  }),
  tag: z.string().openapi({
    description: 'Release tag'
  }),
  releaseDes: z.string().openapi({
    description: 'Release description'
  }),
  devboxUid: z.string().openapi({
    description: 'Devbox UID'
  }),
  cpu: z.number().default(2000).openapi({
    description:
      'CPU cores, it is recommended to use options like 1000, 2000, 4000, 8000, 16000, representing 1Core, 2Core, 4Core, 8Core, 16Core'
  }),
  memory: z.number().default(4096).openapi({
    description: 'Memory in MB'
  })
});

export const ReleaseAndDeployDevboxResponseSchema = z.object({
  code: z.number(),
  data: z
    .object({
      message: z.string().openapi({
        description: 'Release and deploy devbox success message'
      }),
      appName: z.string().openapi({
        description: 'Application name'
      }),
      publicDomains: z
        .array(
          z.object({
            host: z.string(),
            port: z.number()
          })
        )
        .openapi({
          description: 'Public domains'
        })
    })
    .optional()
    .openapi({
      description: 'Release and deploy devbox response'
    }),
  error: z.any().optional()
});

export type ReleaseAndDeployDevboxRequest = z.infer<typeof ReleaseAndDeployDevboxRequestSchema>;
export type ReleaseAndDeployDevboxResponse = z.infer<typeof ReleaseAndDeployDevboxResponseSchema>;
