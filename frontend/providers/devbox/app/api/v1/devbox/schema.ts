import 'zod-openapi/extend';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
export const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

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
'rust'
]).openapi({
  description: 'Runtime environment name (lowercase)'
});

const ProtocolType = z.enum(['HTTP', 'GRPC', 'WS']).openapi({
  description: 'Protocol type'
});

const PortConfig = z.object({
  number: z.number().min(1).max(65535).openapi({
    description: 'Port number (1-65535)'
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
  resource: ResourceConfig.openapi({
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
  exposesPublicDomain: z.boolean().openapi({
    description: 'Whether public domain is enabled'
  }),
  publicDomain: z.string().openapi({
    description: 'Generated public domain'
  }),
  customDomain: z.string().openapi({
    description: 'Custom domain (if provided)'
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