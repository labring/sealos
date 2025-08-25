import 'zod-openapi/extend';
import { z } from 'zod';

export const RequestSchema = z.object({
  devboxName: z.string().min(1).openapi({
    description: 'Devbox name'
  }),
  port: z.number().min(1).max(65535).openapi({
    description: 'Port number to create'
  }),
  protocol: z.enum(['HTTP', 'GRPC', 'WS']).optional().default('HTTP').openapi({
    description: 'Protocol type'
  })
});

export const SuccessResponseSchema = z.object({
  data: z.object({
    portName: z.string().openapi({
      description: 'Port name'
    }),
    port: z.number().openapi({
      description: 'Port number'
    }),
    protocol: z.enum(['HTTP', 'GRPC', 'WS']).openapi({
      description: 'Protocol type'
    }),
    networkName: z.string().optional().openapi({
      description: 'Network name'
    }),
    openPublicDomain: z.boolean().openapi({
      description: 'Whether public domain is enabled'
    }),
    publicDomain: z.string().optional().openapi({
      description: 'Public domain'
    }),
    customDomain: z.string().optional().openapi({
      description: 'Custom domain'
    })
  })
});
export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  error: z.any().optional()
});
