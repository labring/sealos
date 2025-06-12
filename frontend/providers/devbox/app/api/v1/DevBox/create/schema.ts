import 'zod-openapi/extend';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
export const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

const RuntimeName = z.enum([
  'Debian',
  'C++',
  'Rust',
  'Java',
  'Go',
  'Python',
  'Node.js',
  '.Net',
  'C',
  'PHP'
]);

export const RequestSchema = z.object({
  name: z.string().min(1).openapi({
    description: 'Devbox name'
  }),
  runtimeName: RuntimeName.openapi({
    description: 'Runtime name, must be one of the predefined frontend or Node.js templates'
  }),
  cpu: z.number().min(0).default(2000).openapi({
    description:
      'CPU cores, it is recommended to use options like 1000, 2000, 4000, 8000, 16000, representing 1Core, 2Core, 4Core, 8Core, 16Core'
  }),
  memory: z.number().min(0).default(4096).openapi({
    description:
      'Memory in MB, it is recommended to use options like 2048, 4096, 8192, 16384, 32768, representing 2G, 4G, 8G, 16G, 32G'
  })
});

export const SuccessResponseSchema = z.object({
  data: z.object({
    name: z.string().openapi({
      description: 'Devbox name'
    }),
    sshPort: z.number().openapi({
      description: 'SSH port'
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
      description: 'Domain'
    })
  })
});
