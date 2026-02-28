import 'zod-openapi/extend';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
import { normalizeStorageDefaultGi } from '@/utils/storage';
export const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);
const DEFAULT_STORAGE_GI = normalizeStorageDefaultGi(process.env.STORAGE_DEFAULT);

const GpuSchema = z
  .object({
    manufacturers: z.string().default('nvidia').openapi({
      description: 'GPU manufacturers'
    }),
    type: z.string().default('').openapi({
      description: 'GPU type'
    }),
    amount: z.number().default(1).openapi({
      description: 'GPU amount'
    }),
    resource: z.record(z.string()).optional().openapi({
      description: 'GPU resource map'
    })
  })
  .optional();

const NetworkSchema = (devboxName: string) =>
  z.object({
    networkName: z.string().optional().default(`${devboxName}-${nanoid()}`).openapi({
      description: 'Network name'
    }),
    portName: z.string().optional().default(`${nanoid()}`).openapi({
      description: 'Port name'
    }),
    port: z.number().min(1).max(65535).default(3000).openapi({
      description:
        'Port number, this port can be found in the /templateRepository/template/list response data JSON templateList config (you need to call this interface before creating a Devbox)'
    }),
    protocol: z.enum(['HTTP', 'GRPC', 'WS']).optional().default('HTTP').openapi({
      description: 'Protocol'
    }),
    openPublicDomain: z.boolean().default(true).openapi({
      description: 'Open public domain'
    }),
    publicDomain: z
      .string()
      .optional()
      .default(`${nanoid()}.${process.env.INGRESS_DOMAIN}`)
      .openapi({
        description: 'Public domain, no need to fill in'
      }),
    customDomain: z.string().optional().default('').openapi({
      description: 'Custom domain, no need to fill in'
    })
  });

export const RequestSchema = z
  .object({
    name: z.string().min(1).openapi({
      description: 'Devbox name'
    }),
    templateUid: z.string().min(1).openapi({
      description: 'Template UID'
    }),
    templateRepositoryUid: z.string().optional().openapi({
      description: 'Template Repository UID'
    }),
    templateConfig: z.string().default('{}').openapi({
      description: 'Template configuration in JSON format'
    }),
    image: z.string().default('').openapi({
      description: 'Image'
    }),
    cpu: z.number().min(0).default(2000).openapi({
      description:
        'CPU cores, it is recommended to use options like 1000, 2000, 4000, 8000, 16000, representing 1Core, 2Core, 4Core, 8Core, 16Core'
    }),
    memory: z.number().min(0).default(4096).openapi({
      description:
        'Memory in MB, it is recommended to use options like 2048, 4096, 8192, 16384, 32768, representing 2G, 4G, 8G, 16G, 32G'
    }),
    storage: z.number().min(1).default(DEFAULT_STORAGE_GI).openapi({
      description: 'Storage in Gi, e.g. 10, 20, 30'
    }),
    gpu: GpuSchema.optional().openapi({
      description: 'GPU configuration, usually empty'
    }),
    networks: z.array(z.any()).default([]).openapi({
      description: 'Network configurations'
    }),
    env: z.array(z.any()).optional().default([]).openapi({
      description: 'Environment variables (advanced, from template config)'
    }),
    envs: z
      .array(
        z.object({
          key: z.string(),
          value: z.string()
        })
      )
      .optional()
      .default([])
      .openapi({
        description: 'Environment variables (simple key-value pairs)'
      }),
    configMaps: z
      .array(
        z.object({
          id: z.string().optional(),
          path: z.string().refine((path) => path.startsWith('/'), {
            message: 'ConfigMap path must be an absolute path starting with "/"'
          }),
          content: z.string()
        })
      )
      .optional()
      .default([])
      .openapi({
        description: 'ConfigMap configurations'
      }),
    volumes: z
      .array(
        z.object({
          id: z.string().optional(),
          path: z.string().refine((path) => path.startsWith('/'), {
            message: 'Volume path must be an absolute path starting with "/"'
          }),
          size: z.number().min(1).max(30)
        })
      )
      .optional()
      .default([])
      .openapi({
        description: 'Volume configurations (NFS PVC)'
      }),
    sharedMemory: z
      .object({
        enabled: z.boolean().default(false),
        sizeLimit: z.number().min(1).default(64)
      })
      .optional()
      .openapi({
        description: 'Shared memory configuration (emptyDir with Memory medium)'
      })
  })
  .refine(
    (data) => {
      if (!data.configMaps || data.configMaps.length === 0) return true;
      const paths = data.configMaps.map((cm) => cm.path.toLowerCase());
      return new Set(paths).size === paths.length;
    },
    {
      message: 'Duplicate ConfigMap paths are not allowed',
      path: ['configMaps']
    }
  )
  .refine(
    (data) => {
      if (!data.volumes || data.volumes.length === 0) return true;
      const paths = data.volumes.map((vol) => vol.path.toLowerCase());
      return new Set(paths).size === paths.length;
    },
    {
      message: 'Duplicate volume paths are not allowed',
      path: ['volumes']
    }
  )
  .transform((data) => {
    return {
      ...data,
      networks: data.networks.map((network: any) => NetworkSchema(data.name).parse(network))
    };
  });

export const SuccessResponseSchema = z.object({
  data: z.string().default('success')
});
