import 'zod-openapi/extend';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';

export const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

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
  description:
    'Port configuration - with portName to update existing port, without portName to create new port'
});

export const UpdatePortsRequestSchema = z
  .object({
    ports: z.array(PortConfig).openapi({
      description:
        'Array of port configurations. Include portName to update existing ports, exclude portName to create new ports. Existing ports not included will be deleted.'
    })
  })
  .openapi({
    title: 'Update DevBox Ports Request',
    description: 'Request schema for updating DevBox port configurations'
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

export const UpdatePortsResponseSchema = z
  .object({
    data: z.object({
      ports: z.array(PortResponseData).openapi({
        description: 'Updated port configurations after the operation'
      })
    })
  })
  .openapi({
    title: 'Update DevBox Ports Response',
    description: 'Response schema for DevBox port update operations'
  });

export const ErrorResponseSchema = z
  .object({
    code: z.number().openapi({
      description: 'HTTP error code'
    }),
    message: z.string().openapi({
      description: 'Error message'
    }),
    error: z.any().optional().openapi({
      description: 'Detailed error information (optional)'
    })
  })
  .openapi({
    title: 'Error Response',
    description: 'Error response schema'
  });
