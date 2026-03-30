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
import {
  AppDetailType,
  AppEditType,
  TransportProtocolType,
  ApplicationProtocolType
} from '@/types/app';
import {
  HpaSchema,
  StandardEnvSchema,
  StorageSchema,
  StandardConfigMapSchema,
  ResourceSchema,
  PortConfigSchema,
  LaunchpadApplicationSchema,
  LaunchCommandSchema,
  ImageSchema,
  imageRegistrySchema,
  resourceConverters
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

export const SimpleStorageSchema = z
  .object({
    path: z.string().openapi({
      description: 'Mount path in the container'
    }),
    size: z.string().default('1Gi').openapi({
      description: 'Storage size (e.g., "10Gi", "1Ti")'
    })
  })
  .openapi({
    description: 'Simplified storage configuration (name auto-generated from path)'
  });

export const PortUpdateSchema = z
  .object({
    number: z.number().min(1).max(65535).optional().openapi({
      description: 'Port number (1-65535) - required for new ports, optional for updates'
    }),
    protocol: z.enum(['HTTP', 'GRPC', 'WS', 'TCP', 'UDP', 'SCTP']).optional().openapi({
      description:
        'Network protocol. HTTP/GRPC/WS enable public domain access, TCP/UDP/SCTP enable NodePort'
    }),
    exposesPublicDomain: z.boolean().optional().openapi({
      description:
        'Whether to expose this port via public domain (only effective for HTTP/GRPC/WS protocols)'
    }),
    portName: z.string().optional().openapi({
      description: 'Port name (include this to update existing port, omit to create new port)'
    }),
    networkName: z.string().optional().openapi({
      description: 'Network name (read-only, for reference)'
    }),
    serviceName: z.string().optional().openapi({
      description: 'Service name (read-only, for reference)'
    })
  })
  .openapi({
    description:
      'Port configuration. Include portName to update existing port. Omit portName to create new port. Ports not included in the array will be deleted.'
  });

export const UpdateImageSchema = z
  .object({
    imageName: z.string().openapi({
      description: 'Docker image name with tag'
    }),
    imageRegistry: z
      .union([
        z.object({
          username: z.string().openapi({
            description: 'Registry username'
          }),
          password: z.string().openapi({
            description: 'Registry password'
          }),
          serverAddress: z.string().openapi({
            description: 'Registry server address'
          })
        }),
        z.null()
      ])
      .optional()
      .openapi({
        description: 'Image pull secret configuration. Set to null to switch to public image.'
      })
  })
  .openapi({
    description: 'Container image configuration'
  });

export const UpdateAppResourcesSchema = z
  .object({
    resource: z
      .object({
        cpu: z
          .number()
          .refine((val) => [0.1, 0.2, 0.5, 1, 2, 3, 4, 8].includes(val), {
            message: 'CPU must be one of: 0.1, 0.2, 0.5, 1, 2, 3, 4, 8'
          })
          .optional()
          .openapi({
            description: 'CPU allocation in cores',
            enum: [0.1, 0.2, 0.5, 1, 2, 3, 4, 8]
          }),
        memory: z
          .number()
          .refine((val) => [0.1, 0.5, 1, 2, 4, 8, 16].includes(val), {
            message: 'Memory must be one of: 0.1, 0.5, 1, 2, 4, 8, 16'
          })
          .optional()
          .openapi({
            description: 'Memory allocation in GB',
            enum: [0.1, 0.5, 1, 2, 4, 8, 16]
          }),
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
            description:
              'Number of pod replicas (used for fixed instances). To switch from HPA to fixed replicas, set this field and omit hpa field.',
            enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
          }),
        gpu: z
          .object({
            vendor: z.string().optional().openapi({
              description: 'GPU vendor (e.g., nvidia)'
            }),
            type: z.string().optional().openapi({
              description: 'GPU type/model (e.g., V100, A100, T4)'
            }),
            amount: z.number().optional().openapi({
              description: 'Number of GPUs to allocate'
            })
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
              'Horizontal Pod Autoscaler configuration. To switch from fixed replicas to HPA, set this field and omit replicas field.'
          })
      })
      .optional()
      .openapi({
        description:
          'Resource configuration including HPA. For mode switching: provide either replicas (fixed) or hpa (elastic), not both.'
      }),

    launchCommand: LaunchCommandSchema.optional().openapi({
      description: 'Container launch command configuration'
    }),

    image: UpdateImageSchema.optional().openapi({
      description:
        'Container image configuration. Set imageRegistry to null to switch to public image.'
    }),

    env: z.array(StandardEnvSchema).optional().openapi({
      description: 'Environment variables'
    }),

    configMap: z
      .array(StandardConfigMapSchema.pick({ path: true, value: true }))
      .optional()
      .openapi({
        description:
          'ConfigMap configurations (COMPLETE REPLACEMENT). Pass all ConfigMap entries to keep. Empty array removes all ConfigMaps. Omit field to keep existing ConfigMaps unchanged.'
      }),

    storage: z.array(SimpleStorageSchema).optional().openapi({
      description:
        'Storage configurations (COMPLETE REPLACEMENT). Pass all storage entries to keep. Empty array removes all storage. Omit field to keep existing storage unchanged. Name is auto-generated from path.'
    }),

    ports: z.array(PortUpdateSchema).optional().openapi({
      description:
        'Port configurations (COMPLETE REPLACEMENT). Include portName to update existing port, omit portName to create new port. Ports not included will be deleted. Pass empty array [] to remove all ports.'
    })
  })
  .refine(
    (data) =>
      data.resource !== undefined ||
      data.launchCommand !== undefined ||
      data.image !== undefined ||
      data.env !== undefined ||
      data.configMap !== undefined ||
      data.storage !== undefined ||
      data.ports !== undefined,
    {
      message:
        'At least one of resource, launchCommand, image, env, configMap, storage, or ports must be provided'
    }
  )
  .openapi({
    title: 'Update Application Configuration',
    description:
      'Schema for updating application configuration. IMPORTANT: configMap, storage, and ports are COMPLETE REPLACEMENTS when provided - pass all items you want to keep. Use empty array [] to remove all items.'
  });

export const GetAppPodsByAppNameQuerySchema = z.object({
  name: z.string().min(1, { message: 'App name cannot be empty' })
});

const MonitorDataResultSchema = z.object({
  name: z.string().optional(),
  xData: z.array(z.number()),
  yData: z.array(z.string().nullable())
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
    image: ImageSchema.default({
      imageName: 'nginx'
    }).openapi({
      description: 'Container image configuration'
    }),
    launchCommand: LaunchCommandSchema.default({}).openapi({
      description: 'Container launch command configuration'
    }),

    resource: ResourceSchema,

    ports: z
      .array(
        PortConfigSchema.pick({
          number: true,
          protocol: true,
          exposesPublicDomain: true
        })
      )
      .default([
        {
          number: 80,
          protocol: 'HTTP',
          exposesPublicDomain: true
        }
      ])
      .openapi({
        description: 'Port/Network configurations for the application'
      }),

    env: z.array(StandardEnvSchema).default([]).openapi({
      description: 'Environment variables - was: envs'
    }),

    storage: z.array(StorageSchema).default([]).openapi({
      description: 'Storage configurations - was: storeList'
    }),

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
  const cpuValue = resourceConverters.cpuToMillicores(standardRequest.resource.cpu);
  const memoryValue = resourceConverters.memoryToMB(standardRequest.resource.memory);

  const networks = standardRequest.ports?.map((port) => {
    const isApplicationProtocol = ['HTTP', 'GRPC', 'WS'].includes(port.protocol);
    return {
      serviceName: `service-${nanoid()}`,
      networkName: `network-${nanoid()}`,
      portName: nanoid(),
      port: port.number,
      protocol: (isApplicationProtocol ? 'TCP' : port.protocol) as TransportProtocolType,
      appProtocol: (isApplicationProtocol ? port.protocol : 'HTTP') as ApplicationProtocolType,
      openPublicDomain: isApplicationProtocol ? port.exposesPublicDomain : false,
      publicDomain: isApplicationProtocol ? nanoid() : '',
      customDomain: '',
      domain: '',
      nodePort: undefined,
      openNodePort: !isApplicationProtocol
    };
  }) || [
    {
      serviceName: `service-${nanoid()}`,
      networkName: `network-${nanoid()}`,
      portName: nanoid(),
      port: 80,
      protocol: 'TCP' as TransportProtocolType,
      appProtocol: 'HTTP' as ApplicationProtocolType,
      openPublicDomain: true,
      publicDomain: nanoid(),
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

  const hpa = standardRequest.resource.hpa
    ? {
        use: true,
        target: standardRequest.resource.hpa.target,
        value: standardRequest.resource.hpa.value,
        minReplicas: standardRequest.resource.hpa.minReplicas,
        maxReplicas: standardRequest.resource.hpa.maxReplicas
      }
    : {
        use: false,
        target: 'cpu' as const,
        value: 50,
        minReplicas: 1,
        maxReplicas: 5
      };

  const secret = standardRequest.image.imageRegistry
    ? {
        use: true,
        username: standardRequest.image.imageRegistry.username,
        password: standardRequest.image.imageRegistry.password,
        serverAddress: standardRequest.image.imageRegistry.serverAddress
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

  const hasStorage = storeList.length > 0;

  return {
    appName: standardRequest.name,
    imageName: standardRequest.image.imageName,
    runCMD: standardRequest.launchCommand?.command || '',
    cmdParam: standardRequest.launchCommand?.args || '',
    replicas: standardRequest.resource.replicas || 1,
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
    kind: hasStorage ? 'statefulset' : 'deployment'
  };
}
export function transformFromLegacySchema(
  legacyData: AppDetailType
): z.infer<typeof LaunchpadApplicationSchema> {
  return {
    name: legacyData.appName,
    image: {
      imageName: legacyData.imageName,
      imageRegistry: legacyData.secret?.use
        ? {
            username: legacyData.secret.username,
            password: legacyData.secret.password,
            serverAddress: legacyData.secret.serverAddress
          }
        : undefined
    },
    launchCommand: {
      command: legacyData.runCMD,
      args: legacyData.cmdParam
    },
    resource: {
      replicas: legacyData.hpa?.use ? undefined : legacyData.replicas || 1,
      cpu: resourceConverters.millicoresToCpu(legacyData.cpu || 200),
      memory: resourceConverters.mbToMemory(legacyData.memory || 256),
      gpu: legacyData.gpu
        ? {
            vendor: legacyData.gpu.manufacturers,
            type: legacyData.gpu.type,
            amount: legacyData.gpu.amount
          }
        : undefined,
      hpa: legacyData.hpa?.use
        ? {
            target: legacyData.hpa.target,
            value: legacyData.hpa.value,
            minReplicas: legacyData.hpa.minReplicas,
            maxReplicas: legacyData.hpa.maxReplicas
          }
        : undefined
    },
    ports:
      legacyData.networks?.map((network) => {
        const protocol = network.openNodePort ? network.protocol : network.appProtocol || 'HTTP';

        const exposesPublicDomain = network.openNodePort ? true : network.openPublicDomain;

        return {
          serviceName: network.serviceName,
          number: network.port,
          protocol: protocol,
          exposesPublicDomain: exposesPublicDomain,
          networkName: network.networkName,
          portName: network.portName,
          publicDomain: network.publicDomain,
          domain: network.domain,
          customDomain: network.customDomain,
          nodePort: network.nodePort
        };
      }) || [],
    env:
      legacyData.envs?.map((env) => ({
        name: env.key,
        value: env.value,
        valueFrom: env.valueFrom
      })) || [],
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

export const UpdateConfigMapSchema = z.object({
  configMap: z
    .array(StandardConfigMapSchema.pick({ path: true, value: true }))
    .default([])
    .openapi({
      description: 'ConfigMap configurations'
    })
});

export const UpdateStorageSchema = z.object({
  storage: z.array(SimpleStorageSchema).default([]).openapi({
    description:
      'Storage configurations to update (incremental). Only includes storage to add or modify, existing storage not listed will be preserved. Name is auto-generated from path.'
  })
});

export const CreatePortsSchema = z.object({
  ports: z
    .array(
      z.object({
        number: z.number().default(80),
        protocol: z.enum(['HTTP', 'GRPC', 'WS', 'TCP', 'UDP', 'SCTP']),
        exposesPublicDomain: z.boolean()
      })
    )
    .min(1)
    .openapi({
      description: 'Port configurations to create (new ports only)'
    })
});

export const UpdatePortsSchema = z.object({
  ports: z
    .array(
      z
        .object({
          number: z.number(),
          protocol: z.enum(['HTTP', 'GRPC', 'WS', 'TCP', 'UDP', 'SCTP']),
          exposesPublicDomain: z.boolean(),
          networkName: z.string().optional(),
          portName: z.string().optional(),
          serviceName: z.string().optional()
        })
        .refine((data) => data.networkName || data.portName || data.serviceName, {
          message:
            'At least one identifier (networkName/portName/serviceName) is required to locate the port to update'
        })
    )
    .min(1)
    .openapi({
      description:
        'Port configurations to update. Must include at least one identifier (networkName/portName/serviceName) to locate existing port'
    })
});

export const DeletePortsSchema = z.object({
  ports: z.array(z.number()).min(1).openapi({
    description: 'Array of port numbers to delete'
  })
});
