import 'zod-openapi/extend';
import { z } from 'zod';

export const GetPrivateKeyResponseSchema = z
  .object({
    code: z.number().openapi({
      description: 'Response code',
      example: 200
    }),
    data: z
      .object({
        privateKey: z.string().openapi({
          description: 'Base64 encoded private key for SSH connection',
          example: 'LS0tLS1CRUdJTiBPUEVOU1NIIFBSSVZBVEUgS0VZLS0tLS0K...'
        }),
        encoding: z.string().default('base64').openapi({
          description: 'Encoding format of the private key',
          example: 'base64'
        })
      })
      .openapi({
        description: 'Private key data'
      })
  })
  .openapi({
    title: 'Get Private Key Response',
    description: 'Response schema for getting devbox SSH private key'
  });

export const GetPrivateKeyErrorResponseSchema = z
  .object({
    code: z.number().openapi({
      description: 'HTTP error code',
      example: 404
    }),
    message: z.string().openapi({
      description: 'Error message',
      example: 'Devbox or secret not found'
    }),
    error: z
      .any()
      .optional()
      .openapi({
        description: 'Detailed error information (optional)'
      })
  })
  .openapi({
    title: 'Error Response',
    description: 'Error response schema for private key endpoint'
  });

