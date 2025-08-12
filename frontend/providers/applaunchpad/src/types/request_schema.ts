/**
 * API Request and Response Schemas (request_schema.ts)
 *
 * PURPOSE: Define API endpoint schemas and data transformation functions
 *
 * CONTENTS:
 * - CreateLaunchpadRequestSchema: Main API request schema (uses ApiPortSchema)
 * - Various API endpoint schemas (GET, DELETE, UPDATE, etc.)
 * - transformToLegacySchema(): Convert API request to internal format
 * - transformFromLegacySchema(): Convert internal format to API response
 *
 * DESIGN PRINCIPLE:
 * - API requests only include fields users need to provide
 * - Auto-generated fields (networkName, portName, etc.) are created in transform functions
 * - All random values and defaults are handled in transformToLegacySchema()
 *
 * IMPORTS FROM:
 * - schema.ts: Core schemas like ApiPortSchema, ResourceSchema, etc.
 *
 * NOTE: This file defines HOW APIs use the schemas, not what the schemas are
 */
import 'zod-openapi/extend';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
import { AppDetailType, AppEditType } from '@/types/app';
import {
  HpaSchema,
  StandardEnvSchema,
  StorageSchema,
  StandardConfigMapSchema,
  ResourceSchema,
  PortConfigSchema,
  LaunchpadApplicationSchema,
  imageRegistrySchema
} from './schema';

export const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

export const GetAppByAppNameQuerySchema = z.object({
  name: z.string().min(1, { message: 'name cannot be empty' })
});

export const GetAppByAppNameResponseSchema = z.array(z.any()).nullable();

export const DeleteAppByNameQuerySchema = z.object({
  name: z.string().min(1, { message: 'name cannot be empty' })
});

export const DeleteAppByNameResponseSchema = z.object({
  message: z.string()
});

export const UpdateAppResourcesSchema = z
  .object({
    // Resource configuration (use nested structure like CreateLaunchpadRequestSchema)
    resource: z
      .object({
        cpu: z.number().optional().openapi({
          description: 'CPU allocation in millicores'
        }),
        memory: z.number().optional().openapi({
          description: 'Memory allocation in MB'
        }),
        replicas: z.number().min(0).optional().openapi({
          description: 'Number of pod replicas'
        })
      })
      .optional()
      .openapi({
        description: 'Resource configuration'
      }),

    // Basic app info (use consistent field names)
    command: z.string().optional().openapi({
      description: 'Container run command - was: runCMD'
    }),
    args: z.string().optional().openapi({
      description: 'Command arguments - was: cmdParam'
    }),
    image: z.string().optional().openapi({
      description: 'Docker image name with tag - was: imageName'
    }),

    // Environment variables (use StandardEnvSchema for consistency)
    env: z.array(StandardEnvSchema).optional().openapi({
      description: 'Environment variables'
    })
  })
  .refine(
    (data) =>
      data.resource !== undefined ||
      data.command !== undefined ||
      data.args !== undefined ||
      data.image !== undefined ||
      data.env !== undefined,
    {
      message: 'At least one of resource, command, args, image or env must be provided'
    }
  )
  .openapi({
    title: 'Update Application Resources',
    description: 'Schema for updating application configuration (PATCH request)'
  });

export const GetAppPodsByAppNameQuerySchema = z.object({
  name: z.string().min(1, { message: 'App name cannot be empty' })
});

const MonitorDataResultSchema = z.object({
  name: z.string().optional(),
  xData: z.array(z.number()),
  yData: z.array(z.string())
});

const PodStatusMapTypeSchema = z.object({
  label: z.string(),
  value: z.string(),
  color: z.string(),
  reason: z.string().optional(),
  message: z.string().optional()
});

const PodDetailTypeSchema = z
  .object({
    name: z.string(),
    status: PodStatusMapTypeSchema,
    nodeName: z.string(),
    ip: z.string(),
    restarts: z.number(),
    age: z.string(),
    cpuStats: MonitorDataResultSchema,
    memoryStats: MonitorDataResultSchema,
    cpu: z.number(),
    memory: z.number(),
    podReason: z.string().optional(),
    podMessage: z.string().optional(),
    containerStatus: PodStatusMapTypeSchema
  })
  .and(z.record(z.any()));

export const GetAppPodsByAppNameResponseSchema = z.array(PodDetailTypeSchema);

export const CreateLaunchpadRequestSchema = z
  .object({
    name: z.string().default('hello-world').openapi({
      description: 'Application name (must be unique) - was: appName'
    }),
    image: z.string().default('nginx').openapi({
      description: 'Docker image name with tag - was: imageName'
    }),
    command: z.string().default('').openapi({
      description: 'Container run command - was: runCMD'
    }),
    args: z.string().default('').openapi({
      description: 'Command arguments - was: cmdParam'
    }),

    // Resource configuration
    resource: ResourceSchema,

    // Port/Network configuration - pick only API fields from PortConfigSchema
    ports: z
      .array(
        PortConfigSchema.pick({
          port: true,
          protocol: true,
          appProtocol: true,
          exposesPublicDomain: true
        })
      )
      .default([
        {
          port: 80,
          protocol: 'TCP',
          appProtocol: 'HTTP',
          exposesPublicDomain: true
        }
      ])
      .openapi({
        description: 'Port/Network configurations for the application'
      }),

    // Environment variables (envs -> env, key -> name)
    env: z.array(StandardEnvSchema).default([]).openapi({
      description: 'Environment variables - was: envs'
    }),

    // HPA configuration (use -> enabled)
    hpa: HpaSchema.omit({ enabled: true }).nullish().default(null).openapi({
      description: 'Horizontal Pod Autoscaler configuration'
    }),

    // Secret configuration (use -> enabled)
    imageRegistry: imageRegistrySchema.omit({ enabled: true }).nullish().default(null).openapi({
      description: 'Image pull secret configuration'
    }),

    // Storage configuration (storeList -> storage, value -> size)
    storage: z.array(StorageSchema).default([]).openapi({
      description: 'Storage configurations - was: storeList'
    }),

    // ConfigMap configuration (configMapList -> configMap)
    configMap: z
      .array(StandardConfigMapSchema.pick({ path: true, value: true }))
      .default([])
      .openapi({
        description: 'ConfigMap configurations - was: configMapList'
      })
  })
  .openapi({
    title: 'Create Launchpad Application',
    description:
      'Complete application creation schema based on AppEditType with standardized field names'
  });

export function transformToLegacySchema(
  standardRequest: z.infer<typeof CreateLaunchpadRequestSchema>
): AppEditType {
  const cpuValue = standardRequest.resource.cpu;
  const memoryValue = standardRequest.resource.memory;

  const networks = standardRequest.ports?.map((port) => ({
    serviceName: `service-${nanoid()}`, // 自动生成
    networkName: `network-${nanoid()}`, // 自动生成
    portName: nanoid(), // 自动生成
    port: port.port,
    protocol: port.protocol,
    appProtocol: port.appProtocol || 'HTTP', // Default to HTTP if not specified
    openPublicDomain: port.exposesPublicDomain,
    publicDomain: nanoid(), // 自动生成
    customDomain: '', // 暂不支持自定义域名,
    domain: '', // 自动设置
    nodePort: undefined, // 自动生成
    openNodePort: !port.appProtocol // If appProtocol is null/undefined, enable nodePort
  })) || [
    // Default network configuration when no ports specified
    {
      serviceName: `service-${nanoid()}`,
      networkName: `network-${nanoid()}`,
      portName: nanoid(),
      port: 80,
      protocol: 'TCP' as const,
      appProtocol: 'HTTP' as const,
      openPublicDomain: false,
      publicDomain: '',
      customDomain: '',
      domain: '',
      nodePort: undefined,
      openNodePort: false
    }
  ];

  const envs =
    standardRequest.env?.map((env) => ({
      key: env.name,
      value: env.value || '',
      valueFrom: env.valueFrom
    })) || [];

  const hpa = standardRequest.hpa
    ? {
        use: true,
        target: standardRequest.hpa.target,
        value: standardRequest.hpa.value,
        minReplicas: standardRequest.hpa.minReplicas,
        maxReplicas: standardRequest.hpa.maxReplicas
      }
    : {
        use: false,
        target: 'cpu' as const,
        value: 50,
        minReplicas: 1,
        maxReplicas: 5
      };

  const secret = standardRequest.imageRegistry
    ? {
        use: true,
        username: standardRequest.imageRegistry.username,
        password: standardRequest.imageRegistry.password,
        serverAddress: standardRequest.imageRegistry.serverAddress
      }
    : {
        use: false,
        username: '',
        password: '',
        serverAddress: 'docker.io'
      };

  const configMapList =
    standardRequest.configMap?.map((config) => {
      const configName = `config-${nanoid()}`;
      const configKey = nanoid();
      return {
        mountPath: config.path,
        value: config.value || '',
        key: configKey,
        volumeName: configName,
        subPath: configKey
      };
    }) || [];

  const storeList =
    standardRequest.storage?.map((storage) => {
      let sizeValue = 1;
      if (storage.size) {
        const match = storage.size.match(/^(\d+)/);
        if (match) {
          sizeValue = parseInt(match[1]);
        }
      }
      return {
        name: storage.name,
        path: storage.path,
        value: sizeValue
      };
    }) || [];

  return {
    appName: standardRequest.name,
    imageName: standardRequest.image,
    runCMD: standardRequest.command || '',
    cmdParam: standardRequest.args || '',
    replicas: standardRequest.resource.replicas,
    cpu: cpuValue,
    memory: memoryValue,
    gpu: standardRequest.resource.gpu
      ? {
          manufacturers: standardRequest.resource.gpu.vendor,
          type: standardRequest.resource.gpu.type,
          amount: standardRequest.resource.gpu.amount
        }
      : undefined,
    networks,
    envs,
    hpa,
    secret,
    configMapList,
    storeList,
    labels: {},
    volumes: [],
    volumeMounts: [],
    kind: 'deployment'
  };
}

// Transform AppDetailType to LaunchpadApplicationSchema (CreateRequest + 5 additional fields)
export function transformFromLegacySchema(
  legacyData: AppDetailType
): z.infer<typeof LaunchpadApplicationSchema> {
  return {
    // Base fields from CreateLaunchpadRequestSchema
    name: legacyData.appName,
    image: legacyData.imageName,
    command: legacyData.runCMD,
    args: legacyData.cmdParam,
    resource: {
      replicas: legacyData.replicas || 1,
      cpu: legacyData.cpu || 200,
      memory: legacyData.memory || 256,
      gpu: legacyData.gpu
        ? {
            vendor: legacyData.gpu.manufacturers,
            type: legacyData.gpu.type,
            amount: legacyData.gpu.amount
          }
        : undefined
    },
    ports:
      legacyData.networks?.map((network) => ({
        serviceName: network.serviceName,
        port: network.port,
        protocol: network.protocol,
        appProtocol: network.openNodePort ? undefined : network.appProtocol, // If nodePort is open, appProtocol should be null
        exposesPublicDomain: network.openPublicDomain,
        networkName: network.networkName,
        portName: network.portName,
        publicDomain: network.publicDomain,
        domain: network.domain,
        customDomain: network.customDomain,
        nodePort: network.nodePort
      })) || [],
    env:
      legacyData.envs?.map((env) => ({
        name: env.key,
        value: env.value,
        valueFrom: env.valueFrom
      })) || [],
    hpa: legacyData.hpa?.use
      ? {
          target: legacyData.hpa.target,
          value: legacyData.hpa.value,
          minReplicas: legacyData.hpa.minReplicas,
          maxReplicas: legacyData.hpa.maxReplicas
        }
      : undefined,
    imageRegistry: legacyData.secret?.use
      ? {
          username: legacyData.secret.username,
          password: legacyData.secret.password,
          serverAddress: legacyData.secret.serverAddress
        }
      : undefined,
    configMap:
      legacyData.configMapList?.map((config) => ({
        path: config.mountPath,
        name: config.volumeName,
        key: config.key,
        value: config.value
      })) || [],
    storage:
      legacyData.storeList?.map((store) => ({
        name: store.name,
        path: store.path,
        size: `${store.value || 1}Gi`
      })) || [],
    kind: legacyData.kind || 'deployment',

    // Additional 5 fields for GET responses
    id: legacyData.id,
    createTime: legacyData.createTime,
    status: {
      observedGeneration: legacyData.openapi?.status.observedGeneration || 0,
      replicas: legacyData.openapi?.status.replicas || 0,
      availableReplicas: legacyData.openapi?.status.availableReplicas || 0,
      updatedReplicas: legacyData.openapi?.status.updatedReplicas || 0,
      isPause: legacyData.openapi?.status.isPause || false
    }
  };
}
