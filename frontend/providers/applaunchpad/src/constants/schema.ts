/**
 * 核心宗旨：保持两套schema独立共存，通过转换函数桥接，最小化改动，确保标准OpenAPI接口参数简洁
 * Core Philosophy: Keep two schema sets coexisting independently, bridge through transformation functions, minimize changes, ensure standard OpenAPI interface parameters are concise
 */
import 'zod-openapi/extend';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
import { AppDetailType, AppEditType } from '@/types/app';

export const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

export const SuccessResponseSchema = z.object({
  data: z.string().default('success')
});

const NetworkSchema = z
  .object({
    serviceName: z.string().optional().openapi({
      description: 'Service name for the network'
    }),
    networkName: z.string().default('').openapi({
      description: 'Network configuration name'
    }),
    portName: z.string().default(nanoid()).openapi({
      description: 'Unique port identifier'
    }),
    port: z.number().default(80).openapi({
      description: 'Container port number'
    }),
    protocol: z.enum(['TCP', 'UDP', 'SCTP']).default('TCP').openapi({
      description: 'Network protocol'
    }),
    appProtocol: z.enum(['HTTP', 'GRPC', 'WS']).default('HTTP').openapi({
      description: 'Application layer protocol'
    }),
    openPublicDomain: z.boolean().default(false).openapi({
      description: 'Enable public domain access'
    }),
    publicDomain: z.string().default('').openapi({
      description: 'Public domain URL'
    }),
    customDomain: z.string().default('').openapi({
      description: 'Custom domain configuration'
    }),
    domain: z.string().default('').openapi({
      description: 'Domain name'
    }),
    nodePort: z.number().optional().openapi({
      description: 'NodePort for external access (30000-32767)'
    }),
    openNodePort: z.boolean().default(false).openapi({
      description: 'Enable NodePort access'
    })
  })
  .openapi({
    description: 'Network configuration for the application'
  });

const EnvSchema = z
  .object({
    name: z.string().openapi({
      description: 'Environment variable name'
    }),
    value: z.string().openapi({
      description: 'Environment variable value'
    }),
    valueFrom: z.any().optional().openapi({
      description: 'Reference to secret or configmap for the value'
    })
  })
  .array()
  .default([])
  .openapi({
    description: 'Environment variables for the application'
  });

const HpaSchema = z
  .object({
    enabled: z.boolean().default(false).openapi({
      description: 'Enable horizontal pod autoscaling'
    }),
    target: z.enum(['cpu', 'memory', 'gpu']).default('cpu').openapi({
      description: 'Resource metric to scale on'
    }),
    value: z.number().default(50).openapi({
      description: 'Target resource utilization percentage'
    }),
    minReplicas: z.number().default(1).openapi({
      description: 'Minimum number of replicas'
    }),
    maxReplicas: z.number().default(5).openapi({
      description: 'Maximum number of replicas'
    })
  })
  .openapi({
    description: 'Horizontal Pod Autoscaler configuration'
  });

const SecretSchema = z
  .object({
    enabled: z.boolean().default(false).openapi({
      description: 'Use image pull secrets'
    }),
    username: z.string().default('').openapi({
      description: 'Registry username'
    }),
    password: z.string().default('').openapi({
      description: 'Registry password'
    }),
    serverAddress: z.string().default('docker.io').openapi({
      description: 'Registry server address'
    })
  })
  .openapi({
    description: 'Image pull secret configuration'
  });

const ConfigMapSchema = z
  .object({
    mountPath: z.string().openapi({
      description: 'Mount path in the container'
    }),
    value: z.string().openapi({
      description: 'Configuration value or file content'
    }),
    key: z.string().openapi({
      description: 'Configuration key name'
    }),
    volumeName: z.string().openapi({
      description: 'Volume name for the configmap'
    }),
    subPath: z.string().optional().openapi({
      description: 'Specific file path within the configmap'
    })
  })
  .array()
  .default([])
  .openapi({
    description: 'ConfigMap configurations for the application'
  });

const StoreSchema = z
  .object({
    name: z.string().openapi({
      description: 'Persistent volume name'
    }),
    path: z.string().openapi({
      description: 'Mount path in the container'
    }),
    value: z.number().openapi({
      description: 'Storage size in GB'
    })
  })
  .array()
  .default([])
  .openapi({
    description: 'Persistent storage configurations'
  });

const GpuSchema = z
  .object({
    vendor: z.string().default('nvidia').openapi({
      description: 'GPU vendor'
    }),
    type: z.string().default('').openapi({
      description: 'GPU model/type'
    }),
    amount: z.number().default(1).openapi({
      description: 'Number of GPUs'
    })
  })
  .optional()
  .openapi({
    description: 'GPU resource configuration'
  });

const AppEditSchema = z
  .object({
    name: z.string().default('hello-world').openapi({
      description: 'Application name (must be unique)'
    }),
    image: z.string().default('nginx').openapi({
      description: 'Docker image name with optional tag'
    }),
    command: z.string().default('').openapi({
      description: 'Container run command'
    }),
    cmdArgs: z.string().default('').openapi({
      description: 'Command arguments'
    }),
    replicas: z
      .union([z.number(), z.literal('')])
      .default(1)
      .openapi({
        description: 'Number of pod replicas'
      }),
    cpu: z.number().default(200).openapi({
      description: 'CPU allocation in millicores'
    }),
    memory: z.number().default(256).openapi({
      description: 'Memory allocation in MB'
    }),
    gpu: GpuSchema,
    networks: z
      .array(NetworkSchema)
      .default([
        {
          networkName: '',
          portName: nanoid(),
          port: 80,
          protocol: 'TCP',
          appProtocol: 'HTTP',
          openPublicDomain: false,
          openNodePort: false,
          publicDomain: '',
          customDomain: '',
          domain: ''
        }
      ])
      .openapi({
        description: 'Network configurations for the application'
      }),
    env: EnvSchema,
    hpa: HpaSchema,
    secret: SecretSchema,
    configMapList: ConfigMapSchema,
    storeList: StoreSchema,
    labels: z.record(z.string()).default({}).openapi({
      description: 'Kubernetes labels for the application'
    }),
    volumes: z.array(z.any()).default([]).openapi({
      description: 'Volume configurations'
    }),
    volumeMounts: z.array(z.any()).default([]).openapi({
      description: 'Volume mount configurations'
    }),
    kind: z.enum(['deployment', 'statefulset']).default('deployment').openapi({
      description: 'Kubernetes workload type'
    })
  })
  .openapi({
    title: 'Application Configuration',
    description: 'Complete application deployment configuration'
  });

export const CreateAppRequestSchema = AppEditSchema;

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

// Schema for partial app updates (PATCH)
export const UpdateAppResourcesSchema = z
  .object({
    cpu: z.number().optional(),
    memory: z.number().optional(),
    replicas: z.number().min(0).optional(),
    runCMD: z.string().optional(),
    cmdParam: z.string().optional(),
    imageName: z.string().optional(),
    env: EnvSchema.optional()
  })
  .refine(
    (data) =>
      data.cpu !== undefined ||
      data.memory !== undefined ||
      data.replicas !== undefined ||
      data.runCMD !== undefined ||
      data.cmdParam !== undefined ||
      data.imageName !== undefined ||
      data.env !== undefined,
    {
      message:
        'At least one of cpu, memory, replicas, runCMD, cmdParam, imageName or env must be provided'
    }
  );

// Schema for MonitorDataResult
const MonitorDataResultSchema = z.object({
  name: z.string().optional(),
  xData: z.array(z.number()),
  yData: z.array(z.string())
});

// Schema for PodStatusMapType
const PodStatusMapTypeSchema = z.object({
  label: z.string(),
  value: z.string(),
  color: z.string(),
  reason: z.string().optional(),
  message: z.string().optional()
});

// Query params schema for GetAppPodsByAppName
export const GetAppPodsByAppNameQuerySchema = z.object({
  name: z.string().min(1, { message: 'App name cannot be empty' })
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

// ========== New Standardized Schemas ==========

const ResourceSchema = z.object({
  replicas: z.number().min(0).max(10).default(1).openapi({
    description: 'Number of pod replicas'
  }),
  cpu: z.number().default(200).openapi({
    description: 'CPU allocation in millicores'
  }),
  memory: z.number().default(256).openapi({
    description: 'Memory allocation in MB'
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

const StandardEnvSchema = z
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

// StandardHpaSchema removed - using unified HpaSchema with both `use` and `enabled` support

// ImagePullSecretSchema removed - using unified SecretSchema with both `use` and `enabled` support

const StorageSchema = z
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

const StandardConfigMapSchema = z
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
  appProtocol: z.enum(['HTTP', 'GRPC', 'WS']).default('HTTP'),
  usesPublicDomain: z.boolean().default(false),
  usesNodePort: z.boolean().default(false),

  networkName: z.string().default(() => `network-${nanoid()}`),
  portName: z.string().default(() => nanoid()),
  publicDomain: z.string().default(() => nanoid()),
  domain: z.string().default(''),
  customDomain: z.string().optional().openapi({
    description: 'Custom domain'
  }),
  nodePort: z.number().optional()
});

// Complete create request schema based on AppEditType with standardized field names
export const CreateLaunchpadRequestSchema = z
  .object({
    // Basic app info (appName -> name, imageName -> image, runCMD -> command, cmdParam -> args)
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

    // Port/Network configuration (ports field with complete network structure)
    ports: z
      .array(PortConfigSchema)
      .default([
        {
          port: 80,
          protocol: 'TCP',
          appProtocol: 'HTTP',
          usesPublicDomain: false,
          usesNodePort: false,
          portName: nanoid(),
          publicDomain: nanoid(),
          domain: ''
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
    hpa: HpaSchema.optional().openapi({
      description: 'Horizontal Pod Autoscaler configuration'
    }),

    // Secret configuration (use -> enabled)
    secret: SecretSchema.optional().openapi({
      description: 'Image pull secret configuration'
    }),

    // Storage configuration (storeList -> storage, value -> size)
    storage: z.array(StorageSchema).default([]).openapi({
      description: 'Storage configurations - was: storeList'
    }),

    // ConfigMap configuration (configMapList -> configMap)
    configMap: z.array(StandardConfigMapSchema).default([]).openapi({
      description: 'ConfigMap configurations - was: configMapList'
    })
  })
  .openapi({
    title: 'Create Launchpad Application',
    description:
      'Complete application creation schema based on AppEditType with standardized field names'
  });

// Schema for GET launchpad applications (CreateLaunchpadRequestSchema + 5 additional fields)
export const LaunchpadApplicationSchema = z
  .object({
    // Base fields from CreateLaunchpadRequestSchema (without default values)
    name: z.string().openapi({ description: 'Application name' }),
    image: z.string().openapi({ description: 'Container image' }),
    command: z.string().optional().openapi({ description: 'Container command' }),
    args: z.string().optional().openapi({ description: 'Container arguments' }),
    resource: ResourceSchema,
    ports: z.array(NetworkSchema).optional(),
    env: z.array(StandardEnvSchema).optional(),
    hpa: HpaSchema.optional(),
    secret: SecretSchema.optional(),
    storage: z.array(StorageSchema).optional(),
    configMap: z.array(StandardConfigMapSchema).optional(),
    kind: z.enum(['deployment', 'statefulset']).optional(),

    // Additional 5 fields for GET responses
    id: z.string().openapi({ description: 'Application ID' }),
    createTime: z.string().openapi({ description: 'Creation time' }),
    isPause: z.boolean().openapi({ description: 'Whether application is paused' })
  })
  .openapi({
    title: 'Launchpad Application',
    description: 'Launchpad application schema for GET responses (CreateRequest + metadata)'
  });

export function transformToLegacySchema(
  standardRequest: z.infer<typeof CreateLaunchpadRequestSchema>
): AppEditType {
  const cpuValue = standardRequest.resource.cpu;
  const memoryValue = standardRequest.resource.memory;

  const networks =
    standardRequest.ports?.map((port) => ({
      serviceName: port.serviceName,
      networkName: port.networkName,
      portName: port.portName,
      port: port.port,
      protocol: port.protocol,
      appProtocol: port.appProtocol,
      openPublicDomain: port.usesPublicDomain,
      publicDomain: port.publicDomain,
      customDomain: port.customDomain || '',
      domain: port.domain,
      nodePort: port.nodePort,
      openNodePort: port.usesNodePort
    })) || [];

  const envs =
    standardRequest.env?.map((env) => ({
      key: env.name,
      value: env.value || '',
      valueFrom: env.valueFrom
    })) || [];

  const hpa = standardRequest.hpa
    ? {
        use: standardRequest.hpa.enabled,
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

  const secret = standardRequest.secret
    ? {
        use: standardRequest.secret.enabled,
        username: standardRequest.secret.username || '',
        password: standardRequest.secret.password || '',
        serverAddress: standardRequest.secret.serverAddress
      }
    : {
        use: false,
        username: '',
        password: '',
        serverAddress: 'docker.io'
      };

  const configMapList =
    standardRequest.configMap?.map((config) => ({
      mountPath: config.path,
      value: config.value || '',
      key: config.key || config.name,
      volumeName: config.name,
      subPath: config.key
    })) || [];

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
    ports: legacyData.networks || [],
    env:
      legacyData.envs?.map((env) => ({
        name: env.key,
        value: env.value,
        valueFrom: env.valueFrom
      })) || [],
    hpa: legacyData.hpa?.use
      ? {
          enabled: legacyData.hpa.use,
          target: legacyData.hpa.target,
          value: legacyData.hpa.value,
          minReplicas: legacyData.hpa.minReplicas,
          maxReplicas: legacyData.hpa.maxReplicas
        }
      : undefined,
    secret: legacyData.secret?.use
      ? {
          enabled: legacyData.secret.use,
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
    isPause: legacyData.isPause || false
  };
}
