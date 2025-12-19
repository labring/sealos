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
  StandardEnvSchema,
  StorageSchema,
  StandardConfigMapSchema,
  ResourceSchema,
  PortConfigSchema,
  LaunchpadApplicationSchema,
  LaunchCommandSchema,
  ImageSchema,
  resourceConverters
} from './schema';

export const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

function parseCreateTimeToDate(createTime: string): Date | null {
  // Common formats in this repo: 'YYYY/MM/DD HH:mm' or 'YYYY-MM-DD HH:mm' (sometimes with seconds).
  const m = createTime.match(/^(\d{4})[/-](\d{2})[/-](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const [, y, mo, d, h, mi, s] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), s ? Number(s) : 0);
  }

  const native = new Date(createTime);
  return Number.isNaN(native.getTime()) ? null : native;
}

function formatUptimeFromCreateTime(createTime?: string): string {
  if (!createTime) return '0s';
  const start = parseCreateTimeToDate(createTime);
  if (!start) return '0s';
  let timeDiff = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));

  const days = Math.floor(timeDiff / (24 * 60 * 60));
  timeDiff -= days * 24 * 60 * 60;

  const hours = Math.floor(timeDiff / (60 * 60));
  timeDiff -= hours * 60 * 60;

  const minutes = Math.floor(timeDiff / 60);
  timeDiff -= minutes * 60;

  const seconds = timeDiff;

  if (days > 0) return `${days}d${hours}h`;
  if (hours > 0) return `${hours}h${minutes}m`;
  if (minutes > 0) return `${minutes}m${seconds}s`;
  return `${seconds}s`;
}

export const GetAppByAppNameQuerySchema = z.object({
  name: z.string().min(1, { message: 'name cannot be empty' })
});

export const DeleteAppByNameQuerySchema = z.object({
  name: z.string().min(1, { message: 'name cannot be empty' })
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

// Port schema for create/update requests
export const CreatePortConfigSchema = z
  .object({
    number: z.number().min(1).max(65535).openapi({
      description: 'Port number (1-65535)'
    }),
    protocol: z.enum(['http', 'grpc', 'ws', 'tcp', 'udp', 'sctp']).default('http').openapi({
      description:
        'Network protocol. http/grpc/ws enable public domain access, tcp/udp/sctp enable NodePort'
    }),
    isPublic: z.boolean().default(true).openapi({
      description:
        'Whether to expose this port via public domain (only effective for http/grpc/ws protocols)'
    })
  })
  .openapi({
    description: 'Port configuration for creating applications'
  });

export const PortUpdateSchema = z
  .object({
    number: z.number().min(1).max(65535).optional().openapi({
      description: 'Port number (1-65535) - required for new ports, optional for updates'
    }),
    protocol: z.enum(['http', 'grpc', 'ws', 'tcp', 'udp', 'sctp']).optional().openapi({
      description:
        'Network protocol. http/grpc/ws enable public domain access, tcp/udp/sctp enable NodePort'
    }),
    isPublic: z.boolean().optional().openapi({
      description:
        'Whether to expose this port via public domain (only effective for http/grpc/ws protocols)'
    }),
    portName: z.string().optional().openapi({
      description: 'Port name (include this to update existing port, omit to create new port)'
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
          apiUrl: z.string().openapi({
            description: 'Registry API URL'
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
    quota: z
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
      .refine(
        (data) => {
          const hasReplicas = data.replicas !== undefined;
          const hasHpa = data.hpa !== undefined;
          // Allow: only replicas, only hpa, or neither (for partial updates)
          // Disallow: both replicas and hpa at the same time
          return !(hasReplicas && hasHpa);
        },
        {
          message:
            'Must specify either replicas (for fixed instances) or hpa (for elastic scaling), but not both.',
          path: ['quota']
        }
      )
      .optional()
      .openapi({
        description:
          'Quota configuration including HPA. For mode switching: provide either replicas (fixed) or hpa (elastic), not both.'
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
      data.quota !== undefined ||
      data.launchCommand !== undefined ||
      data.image !== undefined ||
      data.env !== undefined ||
      data.configMap !== undefined ||
      data.storage !== undefined ||
      data.ports !== undefined,
    {
      message:
        'At least one of quota, launchCommand, image, env, configMap, storage, or ports must be provided'
    }
  )
  .openapi({
    title: 'Update Application Configuration',
    description:
      'Schema for updating application configuration. IMPORTANT: configMap, storage, and ports are COMPLETE REPLACEMENTS when provided - pass all items you want to keep. Use empty array [] to remove all items.'
  });

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

    quota: ResourceSchema,

    ports: z
      .array(CreatePortConfigSchema)
      .default([
        {
          number: 80,
          protocol: 'http',
          isPublic: true
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
  const cpuValue = resourceConverters.cpuToMillicores(standardRequest.quota.cpu);
  const memoryValue = resourceConverters.memoryToMB(standardRequest.quota.memory);

  const ports = standardRequest.ports || [];
  const defaultPort = ports.length > 0 ? ports[0].number : 80;

  const networks =
    ports.length > 0
      ? ports.map((port) => {
          const protocolLower = (port.protocol || 'http').toLowerCase();
          const isApplicationProtocol = ['http', 'grpc', 'ws'].includes(protocolLower);
          const protocolUpper = protocolLower.toUpperCase();
          return {
            serviceName: `${standardRequest.name}-${port.number}-${nanoid()}-service`,
            networkName: `${standardRequest.name}-${port.number}-${nanoid()}-network`,
            portName: nanoid(),
            port: port.number,
            protocol: (isApplicationProtocol ? 'TCP' : protocolUpper) as TransportProtocolType,
            appProtocol: (isApplicationProtocol
              ? protocolUpper
              : 'HTTP') as ApplicationProtocolType,
            openPublicDomain: isApplicationProtocol ? (port.isPublic ?? true) : false,
            publicDomain: isApplicationProtocol ? nanoid() : '',
            customDomain: '',
            domain: '',
            nodePort: undefined,
            openNodePort: !isApplicationProtocol
          };
        })
      : [
          {
            serviceName: `${standardRequest.name}-${defaultPort}-${nanoid()}-service`,
            networkName: `${standardRequest.name}-${defaultPort}-${nanoid()}-network`,
            portName: nanoid(),
            port: defaultPort,
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

  const hpa = standardRequest.quota.hpa
    ? {
        use: true,
        target: standardRequest.quota.hpa.target,
        value: standardRequest.quota.hpa.value,
        minReplicas: standardRequest.quota.hpa.minReplicas,
        maxReplicas: standardRequest.quota.hpa.maxReplicas
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
    replicas: standardRequest.quota.replicas || 1,
    cpu: cpuValue,
    memory: memoryValue,
    gpu: standardRequest.quota.gpu
      ? {
          manufacturers: standardRequest.quota.gpu.vendor,
          type: standardRequest.quota.gpu.type,
          amount: standardRequest.quota.gpu.amount
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
  legacyData: AppDetailType,
  appName?: string,
  namespace?: string
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
    quota: {
      replicas: legacyData.hpa?.use ? undefined : legacyData.replicas || 1,
      cpu: resourceConverters.millicoresToCpu(legacyData.cpu || 200),
      memory: resourceConverters.mbToMemory(legacyData.memory || 256),
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
        const protocolLower = protocol.toLowerCase();

        let privateAddress: string | undefined;
        if (network.serviceName && namespace) {
          const privateScheme = protocolLower === 'udp' ? 'udp' : 'http';
          privateAddress = `${privateScheme}://${network.serviceName}.${namespace}:${network.port}`;
        }

        let publicAddress: string | undefined;
        if (network.openPublicDomain) {
          if (network.customDomain) {
            const publicScheme =
              protocolLower === 'grpc'
                ? 'grpcs'
                : protocolLower === 'ws'
                  ? 'wss'
                  : protocolLower === 'udp'
                    ? 'udp'
                    : 'https';
            publicAddress = `${publicScheme}://${network.customDomain}`;
          } else if (network.publicDomain && network.domain) {
            const publicScheme =
              protocolLower === 'grpc'
                ? 'grpcs'
                : protocolLower === 'ws'
                  ? 'wss'
                  : protocolLower === 'udp'
                    ? 'udp'
                    : 'https';
            if (network.openNodePort && network.nodePort) {
              publicAddress = `${publicScheme}://${network.publicDomain}.${network.domain}:${network.nodePort}`;
            } else {
              publicAddress = `${publicScheme}://${network.publicDomain}.${network.domain}`;
            }
          }
        } else if (network.openNodePort && network.nodePort && network.domain) {
          const publicScheme = protocolLower === 'udp' ? 'udp' : protocolLower;
          publicAddress = `${publicScheme}://${protocolLower}.${network.domain}:${network.nodePort}`;
        }

        return {
          number: network.port,
          portName: network.portName,
          protocol: protocolLower,
          ...(privateAddress && { privateAddress }),
          ...(publicAddress && { publicAddress }),
          ...(network.customDomain && { customDomain: network.customDomain })
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
    resourceType: 'launchpad',
    kind: legacyData.kind,

    uid: legacyData.id,
    createdAt: legacyData.createTime,
    upTime: formatUptimeFromCreateTime(legacyData.createTime),
    status: legacyData.status.value
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
