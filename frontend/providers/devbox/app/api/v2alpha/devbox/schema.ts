import 'zod-openapi/extend';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
export const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

const CpuOptions = z.union([
  z.literal(0.5), 
  z.literal(1), z.literal(2), z.literal(4), z.literal(8), z.literal(16)
]).openapi({
  description: 'CPU cores - minimum 0.5 cores (e.g., 0.5 -> 500m)',
  example: 1
});

const MemoryOptions = z.union([
  z.literal(0.5), z.literal(1), z.literal(2), 
  z.literal(4), z.literal(8), z.literal(16), z.literal(32)
]).openapi({
  description: 'Memory in GB - minimum 0.5 GB (e.g., 1 -> 1Gi)',
  example: 2
});

const RuntimeName = z.enum([
'nuxt3',
'angular',
'quarkus',
'ubuntu',
'flask',
'java',
'chi',
'net',
'iris',
'hexo',
'python',
'docusaurus',
'vitepress',
'cpp',
'vue',
'nginx',
'rocket',
'debian-ssh',
'vert.x',
'express.js',
'django',
'next.js',
'sealaf',
'go',
'react',
'php',
'svelte',
'c',
'astro',
'umi',
'gin',
'node.js',
'echo',
'claude-code',
'rust'
]).openapi({
  description: 'Runtime environment name (lowercase)'
});

const ProtocolType = z.enum(['http', 'grpc', 'ws']).openapi({
  description: 'Protocol type'
});

const PortConfig = z.object({
  number: z.number().min(1).max(65535).openapi({
    description: 'Port number (1-65535)'
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

const ResourceConfig = z.object({
  cpu: CpuOptions.openapi({
    description: 'CPU allocation in cores'
  }),
  memory: MemoryOptions.openapi({
    description: 'Memory allocation in GB'
  })
});

const EnvConfig = z.object({
  name: z.string().min(1).openapi({
    description: 'Environment variable name'
  }),
  value: z.string().optional().openapi({
    description: 'Environment variable value'
  }),
  valueFrom: z.object({
    secretKeyRef: z.object({
      key: z.string().openapi({
        description: 'Secret key'
      }),
      name: z.string().openapi({
        description: 'Secret name'
      })
    })
  }).optional().openapi({
    description: 'Source for the environment variable value'
  })
}).refine(
  (data) => data.value || data.valueFrom,
  {
    message: "Either 'value' or 'valueFrom' must be provided",
    path: ["value", "valueFrom"]
  }
);

export const RequestSchema = z.object({
  name: z.string().min(1).max(63).regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/).openapi({
    description: 'Devbox name (must be DNS compliant: lowercase, numbers, hyphens, 1-63 chars)'
  }),
  runtime: RuntimeName.openapi({
    description: 'Runtime environment name'
  }),
  quota: ResourceConfig.openapi({
    description: 'Resource allocation for CPU and memory'
  }),
  ports: z.array(PortConfig).optional().default([]).openapi({
    description: 'Port configurations (optional, can be empty)'
  }),
  env: z.array(EnvConfig).optional().default([]).openapi({
    description: 'Environment variables (optional, can be empty)'
  }),
  autostart: z.boolean().optional().default(false).openapi({
    description: 'Auto start devbox after creation (defaults to false)'
  })
});

const PortResponseData = z.object({
  portName: z.string().openapi({
    description: 'Generated port name'
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
  isPublic: z.boolean().openapi({
    description: 'Whether public domain is enabled'
  }),
  publicDomain: z.string().openapi({
    description: 'Generated public domain'
  }),
  customDomain: z.string().openapi({
    description: 'Custom domain (if provided)'
  }),
  serviceName: z.string().openapi({
    description: 'Service name'
  }),
  privateAddress: z.string().openapi({
    description: 'Private address for internal access'
  }),
  error: z.string().optional().openapi({
    description: 'Error message if port creation failed'
  })
});

const PortError = z.object({
  port: z.number().openapi({
    description: 'Port number that failed'
  }),
  error: z.string().openapi({
    description: 'Error message'
  })
});

const PortSummary = z.object({
  totalPorts: z.number().openapi({
    description: 'Total number of ports'
  }),
  successfulPorts: z.number().openapi({
    description: 'Number of successfully created ports'
  }),
  failedPorts: z.number().openapi({
    description: 'Number of failed ports'
  })
});

export const SuccessResponseSchema = z.object({
  data: z.object({
    name: z.string().openapi({
      description: 'Devbox name'
    }),
    sshPort: z.number().openapi({
      description: 'SSH port for connection'
    }),
    base64PrivateKey: z.string().openapi({
      description: 'Base64 encoded SSH private key'
    }),
    userName: z.string().openapi({
      description: 'SSH username'
    }),
    workingDir: z.string().openapi({
      description: 'Default working directory'
    }),
    domain: z.string().openapi({
      description: 'Base domain'
    }),
    ports: z.array(PortResponseData).optional().openapi({
      description: 'Created port configurations'
    }),
    autostarted: z.boolean().optional().openapi({
      description: 'Whether autostart was triggered'
    }),
    portErrors: z.array(PortError).optional().openapi({
      description: 'Errors for failed ports (if any)'
    }),
    summary: PortSummary.optional().openapi({
      description: 'Summary of port creation results'
    })
  })
});

export const ErrorResponseSchema = z.object({
  code: z.number().openapi({
    description: 'Error code'
  }),
  message: z.string().openapi({
    description: 'Error message'
  }),
  error: z.any().optional().openapi({
    description: 'Detailed error information'
  })
});

const DevboxStatus = z.enum(['pending', 'running', 'stopped', 'error']).openapi({
  description: 'Devbox status'
});

export const DevboxListItemSchemaV1 = z.object({
  name: z.string().openapi({
    description: 'Devbox name'
  }),
  uid: z.string().openapi({
    description: 'Devbox UID'
  }),
  resourceType: z.string().default('devbox').openapi({
    description: 'Resource type'
  }),
  runtime: z.string().openapi({
    description: 'Runtime environment (e.g., go, python, node.js)'
  }),
  status: DevboxStatus.openapi({
    description: 'Devbox status (pending, running, stopped, error)'
  }),
  quota: z.object({
    cpu: z.number().openapi({
      description: 'CPU in cores (e.g., 1.0 = 1 core)'
    }),
    memory: z.number().openapi({
      description: 'Memory in GB (e.g., 2.0 = 2GB)'
    })
  }).openapi({
    description: 'Resource quota allocation'
  })
});

export const DevboxListResponseSchemaV1 = z.array(DevboxListItemSchemaV1);