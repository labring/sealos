import 'zod-openapi/extend';

import { z } from 'zod';

export const RequestSchema = z.object({
  devboxName: z.string().min(1).openapi({
    description: 'Devbox name to get ports'
  })
});

export const SuccessResponseSchema = z.object({
  data: z.object({
    ports: z.array(
      z.object({
        portName: z.string(),
        number: z.number(),
        protocol: z.string(),
        networkName: z.string(),
        exposesPublicDomain: z.boolean(),
        publicDomain: z.string(),
        customDomain: z.string(),
        serviceName: z.string(),
        privateAddress: z.string()
      })
    )
  })
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  error: z.any().optional()
});
