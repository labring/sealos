import 'zod-openapi/extend';

import { z } from 'zod';

const TemplateItemSchema = z.object({
  runtime: z.string().openapi({
    description: 'Runtime name (from iconId or repository uid)'
  }),
  config: z.object({
    appPorts: z.array(z.object({
      name: z.string(),
      port: z.number(),
      protocol: z.string()
    })).optional(),
    ports: z.array(z.object({
      containerPort: z.number(),
      name: z.string(),
      protocol: z.string()
    })).optional(),
    releaseArgs: z.array(z.string()).optional(),
    releaseCommand: z.array(z.string()).optional(),
    user: z.string().optional(),
    workingDir: z.string().optional()
  }).openapi({
    description: 'Parsed template configuration'
  })
});

export const SuccessResponseSchema = z.array(TemplateItemSchema);

export const ErrorResponseSchema = z.object({
  code: z.number(),
  error: z.string()
});