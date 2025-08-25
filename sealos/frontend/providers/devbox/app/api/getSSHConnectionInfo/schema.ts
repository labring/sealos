import 'zod-openapi/extend';

import { z } from 'zod';

export const RequestSchema = z.object({
  devboxName: z.string().min(1).openapi({
    description: 'Devbox name to get SSH connection info'
  })
});

export const SuccessResponseSchema = z.object({
  data: z.object({
    base64PublicKey: z.string().openapi({
      description: 'Base64 encoded public key'
    }),
    base64PrivateKey: z.string().openapi({
      description: 'Base64 encoded private key'
    }),
    token: z.string().openapi({
      description: 'JWT token for authentication'
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
    })
  })
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  error: z.any().optional()
});
