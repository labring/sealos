import 'zod-openapi/extend';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';

export const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

// Resource configuration schemas
const CpuOptions = z.union([
  z.literal(0.1), z.literal(0.2), z.literal(0.5), 
  z.literal(1), z.literal(2), z.literal(4), z.literal(8), z.literal(16)
]).openapi({
  description: 'CPU cores - will be converted to millicores for values < 1 (e.g., 0.1 -> 100m)',
  example: 1
});

const MemoryOptions = z.union([
  z.literal(0.1), z.literal(0.5), z.literal(1), z.literal(2), 
  z.literal(4), z.literal(8), z.literal(16), z.literal(32)
]).openapi({
  description: 'Memory in GB - will be converted to Gi format (e.g., 1 -> 1Gi)',
  example: 2
});

const QuotaConfig = z.object({
  cpu: CpuOptions.optional().openapi({
    description: 'CPU allocation in cores (optional)'
  }),
  memory: MemoryOptions.optional().openapi({
    description: 'Memory allocation in GB (optional)'
  })
});

// Port configuration schemas
const ProtocolType = z.enum(['http', 'grpc', 'ws']).openapi({
  description: 'Protocol type'
});

const UpdatePortConfig = z.object({
  portName: z.string().optional().openapi({
    description: 'Existing port name to update (include to update specific port)'
  }),
  number: z.number().min(1).max(65535).optional().openapi({
    description: 'Port number (1-65535) - optional for updates'
  }),
  protocol: ProtocolType.optional().openapi({
    description: 'Protocol type - optional for updates'
  }),
  isPublic: z.boolean().optional().openapi({
    description: 'Enable public domain access - optional for updates'
  }),
  customDomain: z.string().optional().openapi({
    description: 'Custom domain - optional for updates'
  })
});

const CreatePortConfig = z.object({
  number: z.number().min(1).max(65535).openapi({
    description: 'Port number (1-65535) - required for new ports'
  }),
  protocol: ProtocolType.optional().default('http').openapi({
    description: 'Protocol type, defaults to HTTP'
  }),
  isPublic: z.boolean().optional().default(true).openapi({
    description: 'Enable public domain access, defaults to true'
  }),
  customDomain: z.string().optional().openapi({
    description: 'Custom domain (optional)'
  })
});

const PortConfig = z.union([UpdatePortConfig, CreatePortConfig]).openapi({
  description: 'Port configuration - include portName to update existing port, omit to create new port'
});

// Combined request schema
export const UpdateDevboxRequestSchema = z.object({
  quota: QuotaConfig.optional().openapi({
    description: 'Resource allocation for CPU and memory (optional)',
    example: {
      cpu: 1,
      memory: 2
    }
  }),
  ports: z.array(PortConfig).optional().openapi({
    description: 'Array of port configurations. Include portName to update existing ports, exclude portName to create new ports. Existing ports not included will be deleted. (optional)'
  })
}).openapi({
  title: 'Update DevBox Request',
  description: 'Request schema for updating DevBox resource and/or port configurations'
});

// Response schemas
const ResourceResponseData = z.object({
  name: z.string().openapi({
    description: 'Devbox name',
    example: 'my-devbox'
  }),
  quota: QuotaConfig.openapi({
    description: 'Updated quota configuration (input format, optional fields)',
    example: {
      cpu: 1,
      memory: 2
    }
  }),
  k8sResource: z.object({
    cpu: z.string().openapi({
      description: 'Kubernetes CPU format',
      example: '1'
    }),
    memory: z.string().openapi({
      description: 'Kubernetes memory format',
      example: '2Gi'
    })
  }).optional().openapi({
    description: 'Actual Kubernetes resource format (for debugging)'
  }),
  status: z.string().openapi({
    description: 'Devbox status after update',
    example: 'Running'
  }),
  updatedAt: z.string().openapi({
    description: 'Update timestamp in ISO format',
    example: '2023-12-07T10:00:00.000Z'
  })
});

const PortResponseData = z.object({
  portName: z.string().openapi({
    description: 'Generated or existing port name'
  }),
  number: z.number().openapi({
    description: 'Port number'
  }),
  protocol: z.string().openapi({
    description: 'Protocol type'
  }),
  networkName: z.string().openapi({
    description: 'Network/Ingress name'
  }),
  isPublic: z.boolean().openapi({
    description: 'Whether public domain is enabled'
  }),
  publicDomain: z.string().openapi({
    description: 'Generated public domain'
  }),
  customDomain: z.string().openapi({
    description: 'Custom domain (if provided)'
  }),
  serviceName: z.string().optional().openapi({
    description: 'Kubernetes service name'
  }),
  privateAddress: z.string().optional().openapi({
    description: 'Private address for internal access'
  })
});

export const UpdateDevboxResponseSchema = z.object({
  quota: ResourceResponseData.optional().openapi({
    description: 'Quota update result (only if quota was updated)'
  }),
  ports: z.array(PortResponseData).optional().openapi({
    description: 'Updated port configurations after the operation (only if ports were updated)'
  })
}).openapi({
  title: 'Update DevBox Response',
  description: 'Response schema for DevBox update operations'
});

export const ErrorResponseSchema = z.object({
  code: z.number().openapi({
    description: 'HTTP error code'
  }),
  message: z.string().openapi({
    description: 'Error message'
  }),
  error: z.any().optional().openapi({
    description: 'Detailed error information (optional)'
  })
}).openapi({
  title: 'Error Response',
  description: 'Error response schema'
});

// GET ——schemas
const EnvSchema = z.object({
  name: z.string().openapi({
    description: 'Environment variable name'
  }),
  value: z.string().optional().openapi({
    description: 'Direct value of the environment variable'
  }),
  valueFrom: z.object({
    secretKeyRef: z.object({
      name: z.string().openapi({
        description: 'Secret name'
      }),
      key: z.string().openapi({
        description: 'Secret key'
      })
    })
  }).optional().openapi({
    description: 'Reference to a secret value'
  })
}).refine((data) => data.value || data.valueFrom, {
  message: "Either 'value' or 'valueFrom' must be provided"
}).openapi({
  description: 'Environment variable configuration'
});

const ResourceSchema = z.object({
  cpu: z.number().openapi({
    description: 'CPU allocation in cores',
    example: 1
  }),
  memory: z.number().openapi({
    description: 'Memory allocation in GB',
    example: 2
  })
}).openapi({
  description: 'Resource allocation'
});

const SshSchema = z.object({
  host: z.string().openapi({
    description: 'SSH host address',
    example: 'devbox.cloud.sealos.io'
  }),
  port: z.number().openapi({
    description: 'SSH port number',
    example: 40001
  }),
  user: z.string().openapi({
    description: 'SSH username',
    example: 'devbox'
  }),
  workingDir: z.string().openapi({
    description: 'Working directory path',
    example: '/home/devbox/project'
  }),
  privateKey: z.string().optional().openapi({
    description: 'Base64 encoded private key (optional)'
  })
}).openapi({
  description: 'SSH connection information'
});

const PortSchema = z.object({
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
    example: 'http://my-devbox.ns-user123:8080'
  }),
  publicAddress: z.string().optional().openapi({
    description: 'Public access address',
    example: 'https://xyz789.cloud.sealos.io'
  }),
  customDomain: z.string().optional().openapi({
    description: 'Custom domain (if configured)'
  })
}).openapi({
  description: 'Port configuration details'
});

const PodSchema = z.object({
  name: z.string().openapi({
    description: 'Pod name'
  }),
  status: z.string().openapi({
    description: 'Pod status (Running, Pending, Failed, etc.)',
    example: 'Running'
  })
}).openapi({
  description: 'Pod information'
});

export const DevboxDetailResponseSchema = z.object({
  name: z.string().openapi({
    description: 'Devbox name',
    example: 'my-devbox'
  }),
  createdAt: z.string().openapi({
    description: 'Creation time in ISO format',
    example: '2023-12-07T10:00:00.000Z'
  }),
  upTime: z.string().optional().openapi({
    description: 'Running duration since first pod started (human-readable)',
    example: '2d3h'
  }),
  uid: z.string().openapi({
    description: 'Unique identifier',
    example: 'abc123-def456'
  }),
  resourceType: z.string().default('devbox').openapi({
    description: 'Resource type',
    example: 'devbox'
  }),
  runtime: z.string().openapi({
    description: 'Runtime environment name',
    example: 'node.js'
  }),
  image: z.string().openapi({
    description: 'Container image',
    example: 'ghcr.io/labring/sealos-devbox-nodejs:latest'
  }),
  status: z.string().openapi({
    description: 'Devbox status (running, stopped, pending, etc.)',
    example: 'running'
  }),
  quota: ResourceSchema.openapi({
    description: 'CPU and memory quota allocation'
  }),
  ssh: SshSchema.openapi({
    description: 'SSH connection details'
  }),
  env: z.array(EnvSchema).optional().openapi({
    description: 'Environment variables (optional)'
  }),
  ports: z.array(PortSchema).openapi({
    description: 'Port configurations'
  }),
  pods: z.array(PodSchema).openapi({
    description: 'Pod information'
  }),
  operationalStatus: z.any().optional().openapi({
    description: 'Operational status details (optional)'
  })
}).openapi({
  title: 'Get DevBox Detail Response',
  description: 'Response schema for getting Devbox details'
});

// DELETE ——schemas
export const DeleteDevboxRequestSchema = z.object({
  devboxName: z.string().min(1).openapi({
    description: 'Devbox name to delete'
  })
});

export const DeleteDevboxResponseSchema = z.object({
  data: z.string().default('success delete devbox')
}).openapi({
  title: 'Delete DevBox Response',
  description: 'Response schema for deleting a Devbox'
});
