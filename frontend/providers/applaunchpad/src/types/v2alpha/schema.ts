import 'zod-openapi/extend';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';

export const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

export const resourceConverters = {
  cpuToMillicores: (cores: number): number => cores * 1000,

  memoryToMB: (gb: number): number => gb * 1024,

  millicoresToCpu: (millicores: number): number => millicores / 1000,

  mbToMemory: (mb: number): number => mb / 1024
};

export const ResourceSchema = z
  .object({
    replicas: z
      .number()
      .refine(
        (val) =>
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].includes(val),
        {
          message: 'Replicas must be between 1 and 20'
        }
      )
      .optional()
      .openapi({
        description: 'Number of pod replicas (for fixed instances). Cannot be used with hpa.',
        enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
      }),
    cpu: z.number().min(0.1).max(32).default(0.2).openapi({
      description: 'CPU allocation in cores - range [0.1, 32]'
    }),
    memory: z.number().min(0.1).max(32).default(0.5).openapi({
      description: 'Memory allocation in GB - range [0.1, 32]'
    }),
    gpu: z
      .object({
        vendor: z.string().default('nvidia'),
        type: z.string(),
        amount: z.number().default(1)
      })
      .optional()
      .openapi({
        description: 'GPU resource configuration'
      }),
    hpa: z
      .object({
        target: z.enum(['cpu', 'memory', 'gpu']).openapi({
          description: 'Resource metric to scale on'
        }),
        value: z.number().openapi({
          description: 'Target resource utilization percentage'
        }),
        minReplicas: z.number().openapi({
          description: 'Minimum number of replicas'
        }),
        maxReplicas: z.number().openapi({
          description: 'Maximum number of replicas'
        })
      })
      .optional()
      .openapi({
        description:
          'Horizontal Pod Autoscaler configuration. If present, enables elastic scaling; if absent, uses fixed replicas.'
      })
  })
  .refine(
    (data) => {
      const hasReplicas = data.replicas !== undefined;
      const hasHpa = data.hpa !== undefined;
      return (hasReplicas && !hasHpa) || (!hasReplicas && hasHpa);
    },
    {
      message:
        'Must specify either replicas (for fixed instances) or hpa (for elastic scaling), but not both.'
    }
  );

export const LaunchCommandSchema = z
  .object({
    command: z.string().optional().openapi({
      description: 'Container run command - was: runCMD'
    }),
    args: z.string().optional().openapi({
      description: 'Command arguments - was: cmdParam'
    })
  })
  .openapi({
    description: 'Container launch command configuration'
  });

export const ImageSchema = z
  .object({
    imageName: z.string().openapi({
      description: 'Docker image name with tag'
    }),
    imageRegistry: z
      .object({
        username: z.string().openapi({
          description: 'Registry username'
        }),
        password: z.string().openapi({
          description: 'Registry password'
        }),
        serverAddress: z.string().openapi({
          description: 'Registry server address'
        })
      })
      .nullable()
      .optional()
      .openapi({
        description:
          'Image pull secret configuration. Set to null to switch from private to public image.'
      })
  })
  .openapi({
    description: 'Container image configuration'
  });

export const StandardEnvSchema = z
  .object({
    name: z.string().openapi({
      description: 'Environment variable name'
    }),
    value: z.string().optional().openapi({
      description: 'Environment variable value'
    }),
    valueFrom: z
      .object({
        secretKeyRef: z.object({
          key: z.string(),
          name: z.string()
        })
      })
      .optional()
      .openapi({
        description: 'Reference to secret for the value'
      })
  })
  .openapi({
    description: 'Environment variable configuration'
  });

export const StorageSchema = z
  .object({
    name: z.string().openapi({
      description: 'Persistent volume name'
    }),
    path: z.string().openapi({
      description: 'Mount path in the container'
    }),
    size: z.string().default('1Gi').openapi({
      description: 'Storage size (e.g., "10Gi", "1Ti")'
    })
  })
  .openapi({
    description: 'Persistent storage configuration'
  });

export const StandardConfigMapSchema = z
  .object({
    name: z.string().openapi({
      description: 'ConfigMap name'
    }),
    path: z.string().openapi({
      description: 'Mount path in the container'
    }),
    key: z.string().optional().openapi({
      description: 'Specific key within the configmap'
    }),
    value: z.string().optional().openapi({
      description: 'Configuration value or file content'
    })
  })
  .openapi({
    description: 'ConfigMap configuration'
  });

export const PortConfigSchema = z
  .object({
    number: z.number().openapi({
      description: 'Port number',
      example: 8080
    }),
    portName: z.string().optional().openapi({
      description: 'Port name identifier'
    }),
    protocol: z.string().optional().openapi({
      description: 'Protocol type (http, grpc, ws)',
      example: 'http'
    }),
    privateAddress: z.string().optional().openapi({
      description: 'Private access address',
      example: 'http://my-app.ns-user123:8080'
    }),
    publicAddress: z.string().optional().openapi({
      description: 'Public access address',
      example: 'https://xyz789.cloud.sealos.io'
    }),
    customDomain: z.string().optional().openapi({
      description: 'Custom domain (if configured)'
    })
  })
  .openapi({
    description: 'Port configuration details'
  });

export const LaunchpadApplicationSchema = z
  .object({
    name: z.string().openapi({ description: 'Application name' }),
    image: ImageSchema.openapi({ description: 'Container image configuration' }),
    launchCommand: LaunchCommandSchema.optional().openapi({
      description: 'Container launch command configuration'
    }),
    quota: ResourceSchema,
    ports: z.array(PortConfigSchema).optional(),
    env: z.array(StandardEnvSchema).optional(),
    storage: z.array(StorageSchema).optional(),
    configMap: z.array(StandardConfigMapSchema).optional(),
    resourceType: z.literal('launchpad').openapi({
      description: 'Resource type identifier (fixed for v2alpha)',
      example: 'launchpad'
    }),
    kind: z
      .enum(['deployment', 'statefulset'])
      .optional()
      .openapi({ description: 'Underlying Kubernetes workload kind' }),

    uid: z.string().openapi({ description: 'Application UID' }),
    createdAt: z.string().openapi({ description: 'Creation time' }),
    upTime: z.string().openapi({ description: 'Uptime (running duration)', example: '2h15m' }),
    status: z
      .enum(['running', 'creating', 'waiting', 'error', 'pause'])
      .openapi({ description: 'Application status' })
  })
  .openapi({
    title: 'Launchpad Application',
    description: 'Launchpad application schema for GET responses (CreateRequest + metadata)'
  });
