import 'zod-openapi/extend';

import { z } from 'zod';

const RuntimeSchema = z.object({
  uid: z.string().openapi({
    description: 'Template repository unique identifier'
  }),
  iconId: z.string().nullable().openapi({
    description: 'Runtime icon ID (runtime name)'
  }),
  name: z.string().openapi({
    description: 'Template repository name'
  }),
  kind: z.enum(['FRAMEWORK', 'OS', 'LANGUAGE', 'SERVICE', 'CUSTOM']).openapi({
    description: 'Template repository kind'
  }),
  description: z.string().nullable().openapi({
    description: 'Template repository description'
  }),
  isPublic: z.boolean().openapi({
    description: 'Whether the template repository is public'
  })
});

const ConfigSchema = z.object({
  templateUid: z.string().openapi({
    description: 'Template unique identifier'
  }),
  templateName: z.string().openapi({
    description: 'Template name'
  }),
  runtimeUid: z.string().openapi({
    description: 'Runtime unique identifier (template repository uid)'
  }),
  runtime: z.string().nullable().openapi({
    description: 'Runtime name (from iconId field)'
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

export const SuccessResponseSchema = z.object({
  data: z.object({
    runtime: z.array(RuntimeSchema).openapi({
      description: 'List of available runtimes (template repositories)'
    }),
    config: z.array(ConfigSchema).openapi({
      description: 'List of template configurations'
    })
  })
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  error: z.string()
});