/**
 * Core Data Type Schemas (schema.ts)
 *
 * PURPOSE: Define fundamental data structure schemas used across the application
 *
 * CONTENTS:
 * - ApiPortSchema: Pure API request schema (only fields user needs to pass)
 * - PortConfigSchema: Complete port schema (includes auto-generated fields)
 * - ResourceSchema, HpaSchema, imageRegistrySchema, etc.: Core business object schemas
 * - LaunchpadApplicationSchema: Schema for GET responses
 *
 * USAGE:
 * - Import these schemas in request_schema.ts for API definitions
 * - Use ApiPortSchema for API requests (minimal fields)
 * - Use PortConfigSchema for internal transformations (complete fields)
 *
 * NOTE: This file defines WHAT the data looks like, not HOW APIs use it
 */
import 'zod-openapi/extend';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';

export const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

// Conversion utilities for resource values
export const resourceConverters = {
  // Convert CPU cores to millicores (e.g., 0.1 -> 100, 1 -> 1000)
  cpuToMillicores: (cores: number): number => cores * 1000,

  // Convert GB to MB (e.g., 0.5 -> 512, 1 -> 1024)
  memoryToMB: (gb: number): number => gb * 1024,

  // Convert millicores to cores for display (e.g., 100 -> 0.1, 1000 -> 1)
  millicoresToCpu: (millicores: number): number => millicores / 1000,

  // Convert MB to GB for display (e.g., 512 -> 0.5, 1024 -> 1)
  mbToMemory: (mb: number): number => mb / 1024
};

export const ResourceSchema = z.object({
  replicas: z
    .number()
    .refine(
      (val) =>
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].includes(val),
      {
        message: 'Replicas must be between 1 and 20'
      }
    )
    .default(1)
    .openapi({
      description: 'Number of pod replicas',
      enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    }),
  cpu: z
    .number()
    .refine((val) => [0.1, 0.2, 0.5, 1, 2, 3, 4, 8].includes(val), {
      message: 'CPU must be one of: 0.1, 0.2, 0.5, 1, 2, 3, 4, 8'
    })
    .default(0.2)
    .openapi({
      description: 'CPU allocation in cores',
      enum: [0.1, 0.2, 0.5, 1, 2, 3, 4, 8]
    }),
  memory: z
    .number()
    .refine((val) => [0.1, 0.5, 1, 2, 4, 8, 16].includes(val), {
      message: 'Memory must be one of: 0.1, 0.5, 1, 2, 4, 8, 16'
    })
    .default(0.5)
    .openapi({
      description: 'Memory allocation in GB',
      enum: [0.1, 0.5, 1, 2, 4, 8, 16]
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
    })
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

export const HpaSchema = z
  .object({
    enabled: z.boolean().default(false).openapi({
      description: 'Enable horizontal pod autoscaling'
    }),
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
  .openapi({
    description: 'Horizontal Pod Autoscaler configuration'
  });

export const imageRegistrySchema = z
  .object({
    enabled: z.boolean().default(false).openapi({
      description: 'Use image pull secrets'
    }),
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
  .openapi({
    description: 'Image pull secret configuration'
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

export const PortConfigSchema = z.object({
  serviceName: z.string().optional().openapi({
    description: 'Kubernetes service name'
  }),
  port: z.number().default(80),
  protocol: z.enum(['TCP', 'UDP', 'SCTP']).default('TCP'),
  appProtocol: z.enum(['HTTP', 'GRPC', 'WS']).optional().openapi({
    description: 'Application layer protocol. If null, enables NodePort'
  }),
  exposesPublicDomain: z.boolean().default(true).openapi({
    description: 'Enable public domain access'
  }),
  // Auto-generated fields - not passed via API
  networkName: z.string().default(() => `network-${nanoid()}`),
  portName: z.string().default(() => nanoid()),
  publicDomain: z.string().default(() => nanoid()),
  domain: z.string().default(''),
  customDomain: z.string().optional().openapi({
    description: 'Custom domain'
  }),
  nodePort: z.number().optional()
});

export const LaunchpadApplicationSchema = z
  .object({
    // Base fields from CreateLaunchpadRequestSchema (without default values)
    name: z.string().openapi({ description: 'Application name' }),
    image: z.string().openapi({ description: 'Container image' }),
    command: z.string().optional().openapi({ description: 'Container command' }),
    args: z.string().optional().openapi({ description: 'Container arguments' }),
    resource: ResourceSchema,
    ports: z.array(PortConfigSchema).optional(),
    env: z.array(StandardEnvSchema).optional(),
    hpa: HpaSchema.omit({ enabled: true }).optional(),
    imageRegistry: imageRegistrySchema.omit({ enabled: true }).optional(),
    storage: z.array(StorageSchema).optional(),
    configMap: z.array(StandardConfigMapSchema).optional(),
    kind: z.enum(['deployment', 'statefulset']).optional(),

    // Additional metadata fields for GET responses
    id: z.string().openapi({ description: 'Application ID' }),
    createTime: z.string().openapi({ description: 'Creation time' }),
    status: z.object({
      observedGeneration: z.number().openapi({ description: 'Observed generation' }),
      replicas: z.number().openapi({ description: 'Replicas' }),
      availableReplicas: z.number().openapi({ description: 'Available replicas' }),
      updatedReplicas: z.number().openapi({ description: 'Updated replicas' }),
      isPause: z.boolean().default(false).openapi({ description: 'Whether application is paused' })
    })
  })
  .openapi({
    title: 'Launchpad Application',
    description: 'Launchpad application schema for GET responses (CreateRequest + metadata)'
  });
