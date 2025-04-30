import 'zod-openapi/extend';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
export const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

const RuntimeName = z.enum([
  'Vue.js',
  'React',
  'Nuxt3',
  'Next.js',
  'Node.js',
  'Express.js',
  'Angular',
  'Svelte',
  'UmiJS',
  'Astro',
  'Debian'
]);

export const DevboxFormSchema = z.object({
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

export const RequestSchema = z.object({
  devboxForm: DevboxFormSchema
});

export const SuccessResponseSchema = z.object({
  data: z.object({
    name: z.string().openapi({
      description: 'Devbox name'
    }),
    runtimeName: z.string().openapi({
      description: 'Runtime name'
    }),
    image: z.string().openapi({
      description: 'Image'
    }),
    cpu: z.number().openapi({
      description: 'CPU'
    }),
    memory: z.number().openapi({
      description: 'Memory'
    })
  })
});
