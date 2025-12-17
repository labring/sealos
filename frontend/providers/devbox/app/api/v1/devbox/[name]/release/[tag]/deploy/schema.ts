import 'zod-openapi/extend';
import { z } from 'zod';


export const DeployDevboxPathParamsSchema = z.object({
  name: z.string().min(1).openapi({
    description: 'Devbox name'
  }),
  tag: z.string().min(1).openapi({
    description: 'Devbox release version tag'
  })
});


export const DeployDevboxRequestSchema = z.object({}).openapi({
  description: 'No request body needed - parameters are passed via URL path'
});

export const DeployDevboxSuccessResponseSchema = z.object({
  data: z.object({
    message: z.string().default('success deploy devbox').openapi({
      description: 'Deploy devbox success message'
    }),

    launchpadApp: z.object({
      name: z.string().openapi({
        description: 'Application name'
      }),
      image: z.string().openapi({
        description: 'Container image'
      }),
      command: z.string().optional().openapi({
        description: 'Container command'
      }),
      args: z.string().optional().openapi({
        description: 'Container arguments'
      }),
      resource: z.object({
        replicas: z.number().openapi({
          description: 'Number of pod replicas'
        }),
        cpu: z.number().openapi({
          description: 'CPU allocation in millicores'
        }),
        memory: z.number().openapi({
          description: 'Memory allocation in MB'
        })
      }),
      ports: z.array(z.object({
        port: z.number(),
        protocol: z.string(),
        appProtocol: z.string().optional(),
        exposesPublicDomain: z.boolean(),
        serviceName: z.string().optional(),
        networkName: z.string().optional(),
        portName: z.string().optional(),
        publicDomain: z.string().optional(),
        domain: z.string().optional(),
        customDomain: z.string().optional(),
        nodePort: z.number().optional()
      })).optional().openapi({
        description: 'Port configurations'
      }),
      env: z.array(z.object({
        name: z.string(),
        value: z.string().optional(),
        valueFrom: z.object({
          secretKeyRef: z.object({
            key: z.string(),
            name: z.string()
          })
        }).optional()
      })).optional().openapi({
        description: 'Environment variables'
      })
    }),
    publicDomains: z.array(z.object({
      host: z.string(),
      port: z.number()
    })).openapi({
      description: 'Public domains for accessing the application'
    })
  })
});

export const DeployDevboxErrorResponseSchema = z.object({
  code: z.number(),
  error: z.any()
});
