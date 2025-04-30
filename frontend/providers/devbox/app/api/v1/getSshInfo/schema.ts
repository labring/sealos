import 'zod-openapi/extend';

import { z } from 'zod';

export const RequestSchema = z.object({
  devboxName: z.string().min(1).openapi({
    description: 'Devbox name to get SSH connection info'
  })
});

export const SuccessResponseSchema = z.object({
  data: z.object({
    base64PrivateKey: z.string().openapi({
      description: 'Base64 encoded private key'
    }),
    userName: z.string().openapi({
      description: 'SSH username'
    }),
    workingDir: z.string().openapi({
      description: 'Working directory'
    }),
    releaseCommand: z.string().openapi({
      description: 'Release command'
    }),
    releaseArgs: z.string().openapi({
      description: 'Release arguments'
    }),
    sshPort: z.number().openapi({
      description: 'SSH port'
    }),
    domain: z.string().openapi({
      description: 'Domain'
    })
  })
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  error: z.any().optional()
});
