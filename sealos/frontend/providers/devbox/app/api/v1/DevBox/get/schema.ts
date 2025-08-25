import 'zod-openapi/extend';

import { z } from 'zod';

export const RequestSchema = z.object({
  devboxName: z.string().min(1).openapi({
    description: 'Devbox name'
  })
});

export const NetworkSchema = z.object({
  portName: z.string().openapi({
    description: 'Port Name'
  }),
  port: z.number().openapi({
    description: 'Port'
  }),
  protocol: z.string().openapi({
    description: 'Protocol'
  }),
  networkName: z.string().optional().openapi({
    description: 'Network Name'
  }),
  openPublicDomain: z.boolean().openapi({
    description: 'Open Public Domain'
  }),
  publicDomain: z.string().optional().openapi({
    description: 'Public Domain'
  }),
  customDomain: z.string().optional().openapi({
    description: 'Custom Domain'
  })
});

export const SuccessResponseSchema = z.object({
  data: z.object({
    id: z.string().openapi({
      description: 'Devbox ID'
    }),
    name: z.string().openapi({
      description: 'Devbox name'
    }),
    status: z.string().openapi({
      description: 'Devbox Status'
    }),
    createTime: z.string().openapi({
      description: 'Creation Time'
    }),
    imageName: z.string().openapi({
      description: 'Image Name'
    }),
    sshPort: z.number().openapi({
      description: 'SSH Port'
    }),
    cpu: z.number().openapi({
      description: 'CPU'
    }),
    memory: z.number().openapi({
      description: 'Memory'
    }),
    networks: z.array(NetworkSchema).openapi({
      description: 'Network Configurations'
    }),
    base64PrivateKey: z.string().openapi({
      description: 'Base64 encoded private key'
    }),
    userName: z.string().openapi({
      description: 'User name'
    }),
    workingDir: z.string().openapi({
      description: 'Working directory'
    }),
    domain: z.string().openapi({
      description: 'Sealos domain'
    })
  })
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  error: z.string()
});
