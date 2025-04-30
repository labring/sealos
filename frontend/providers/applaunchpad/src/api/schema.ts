import 'zod-openapi/extend';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';

export const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

const NetworkSchema = z.object({
  networkName: z.string().openapi({
    description: 'Network name'
  }),
  portName: z.string().openapi({
    description: 'Port name'
  }),
  port: z.number().openapi({
    description: 'Port'
  }),
  protocol: z.string().openapi({
    description: 'Protocol'
  }),
  appProtocol: z.string().openapi({
    description: 'App protocol'
  }),
  customDomain: z.string().openapi({
    description: 'Custom domain'
  }),
  domain: z.string().openapi({
    description: 'Domain'
  }),
  nodePort: z.number().optional().openapi({
    description: 'Node port'
  }),
  openNodePort: z.boolean().openapi({
    description: 'Open node port'
  })
});

const EnvSchema = z.object({
  key: z.string().openapi({
    description: 'Key'
  }),
  value: z.string().openapi({
    description: 'Value'
  }),
  valueFrom: z.any().optional().openapi({
    description: 'Value from'
  })
});

const HpaSchema = z.object({
  use: z.boolean().openapi({
    description: 'Use'
  }),
  target: z.string().openapi({
    description: 'Target'
  }),
  value: z.number().openapi({
    description: 'Value'
  }),
  minReplicas: z.number().openapi({
    description: 'Min replicas'
  }),
  maxReplicas: z.number().openapi({
    description: 'Max replicas'
  })
});

const SecretSchema = z.object({
  use: z.boolean().openapi({
    description: 'Use'
  }),
  username: z.string().openapi({
    description: 'Username'
  }),
  password: z.string().openapi({
    description: 'Password'
  }),
  serverAddress: z.string().openapi({
    description: 'Server address'
  })
});

const ConfigMapSchema = z.object({
  mountPath: z.string().openapi({
    description: 'Mount path'
  }),
  value: z.string().openapi({
    description: 'Value'
  })
});

const StoreSchema = z.object({
  name: z.string().openapi({
    description: 'Name'
  }),
  path: z.string().openapi({
    description: 'Path'
  }),
  value: z.number().openapi({
    description: 'Value'
  })
});

const GpuSchema = z
  .object({
    manufacturers: z.string().openapi({
      description: 'Manufacturers'
    }),
    type: z.string().openapi({
      description: 'Type'
    }),
    amount: z.number().openapi({
      description: 'Amount'
    })
  })
  .optional();

export const AppEditSchema = z.object({
  appName: z.string().openapi({
    description: 'App name'
  }),
  imageName: z.string().openapi({
    description: 'Image name'
  }),
  runCMD: z.string().openapi({
    description: 'Run CMD'
  }),
  cmdParam: z.string().openapi({
    description: 'Cmd param'
  }),
  gpu: GpuSchema,
  networks: z.array(NetworkSchema).openapi({
    description: 'Networks'
  }),
  envs: z.array(EnvSchema).openapi({
    description: 'Envs'
  }),
  hpa: HpaSchema.openapi({
    description: 'HPA'
  }),
  secret: SecretSchema.openapi({
    description: 'Secret'
  }),
  configMapList: z.array(ConfigMapSchema).openapi({
    description: 'ConfigMap list'
  }),
  storeList: z.array(StoreSchema).openapi({
    description: 'Store list'
  }),
  labels: z.record(z.string()).openapi({
    description: 'Labels'
  }),
  volumes: z.array(z.any()).openapi({
    description: 'Volumes'
  }),
  volumeMounts: z.array(z.any()).openapi({
    description: 'Volume mounts'
  }),
  kind: z.enum(['deployment', 'statefulset']).openapi({
    description: 'Kind'
  })
});

export const RequestSchema = z.object({
  appForm: AppEditSchema
});

export const SuccessResponseSchema = z.object({
  data: z.string().default('success')
});
