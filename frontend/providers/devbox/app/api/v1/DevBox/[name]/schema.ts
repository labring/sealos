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

const ResourceConfig = z.object({
  cpu: CpuOptions.openapi({
    description: 'CPU allocation in cores'
  }),
  memory: MemoryOptions.openapi({
    description: 'Memory allocation in GB'
  })
});

// Port configuration schemas
const ProtocolType = z.enum(['HTTP', 'GRPC', 'WS']).openapi({
  description: 'Protocol type'
});

const UpdatePortConfig = z.object({
  portName: z.string().openapi({
    description: 'Existing port name to update - identifies the port to modify'
  }),
  number: z.number().min(1).max(65535).optional().openapi({
    description: 'Port number (1-65535) - optional for updates'
  }),
  protocol: ProtocolType.optional().openapi({
    description: 'Protocol type - optional for updates'
  }),
  exposesPublicDomain: z.boolean().optional().openapi({
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
  protocol: ProtocolType.optional().default('HTTP').openapi({
    description: 'Protocol type, defaults to HTTP'
  }),
  exposesPublicDomain: z.boolean().optional().default(true).openapi({
    description: 'Enable public domain access, defaults to true'
  }),
  customDomain: z.string().optional().openapi({
    description: 'Custom domain (optional)'
  })
});

const PortConfig = z.union([UpdatePortConfig, CreatePortConfig]).openapi({
  description: 'Port configuration - with portName to update existing port, without portName to create new port'
});

// Combined request schema
export const UpdateDevboxRequestSchema = z.object({
  resource: ResourceConfig.optional().openapi({
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
  resource: ResourceConfig.openapi({
    description: 'Updated resource configuration (input format)',
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
  protocol: ProtocolType.openapi({
    description: 'Protocol type'
  }),
  networkName: z.string().openapi({
    description: 'Network/Ingress name'
  }),
  exposesPublicDomain: z.boolean().openapi({
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
  data: z.object({
    resource: ResourceResponseData.optional().openapi({
      description: 'Resource update result (only if resource was updated)'
    }),
    ports: z.array(PortResponseData).optional().openapi({
      description: 'Updated port configurations after the operation (only if ports were updated)'
    })
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
