import 'zod-openapi/extend';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';

export const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

export const SuccessResponseSchema = z.object({
  data: z.string().default('success')
});

const NetworkSchema = z.object({
  networkName: z.string().default(''),
  portName: z.string().default(nanoid()),
  port: z.number().default(80),
  protocol: z.enum(['TCP', 'UDP', 'SCTP']).default('TCP'),
  appProtocol: z.enum(['HTTP', 'GRPC', 'WS']).default('HTTP'),
  openPublicDomain: z.boolean().default(false),
  publicDomain: z.string().default(''),
  customDomain: z.string().default(''),
  domain: z.string().default(''),
  nodePort: z.number().optional(),
  openNodePort: z.boolean().default(false)
});

const EnvSchema = z
  .object({
    key: z.string(),
    value: z.string(),
    valueFrom: z.any().optional()
  })
  .array()
  .default([]);

const HpaSchema = z.object({
  use: z.boolean().default(false),
  target: z.enum(['cpu', 'memory', 'gpu']).default('cpu'),
  value: z.number().default(50),
  minReplicas: z.number().default(1),
  maxReplicas: z.number().default(5)
});

const SecretSchema = z.object({
  use: z.boolean().default(false),
  username: z.string().default(''),
  password: z.string().default(''),
  serverAddress: z.string().default('docker.io')
});

const ConfigMapSchema = z
  .object({
    mountPath: z.string(),
    value: z.string()
  })
  .array()
  .default([]);

const StoreSchema = z
  .object({
    name: z.string(),
    path: z.string(),
    value: z.number()
  })
  .array()
  .default([]);

const GpuSchema = z
  .object({
    manufacturers: z.string().default('nvidia'),
    type: z.string().default(''),
    amount: z.number().default(1)
  })
  .optional();

const AppEditSchema = z.object({
  appName: z.string().default('hello-world'),
  imageName: z.string().default('nginx'),
  runCMD: z.string().default(''),
  cmdParam: z.string().default(''),
  replicas: z.union([z.number(), z.literal('')]).default(1),
  cpu: z.number().default(200),
  memory: z.number().default(256),
  gpu: GpuSchema,
  networks: z.array(NetworkSchema).default([
    {
      networkName: '',
      portName: nanoid(),
      port: 80,
      protocol: 'TCP',
      appProtocol: 'HTTP',
      openPublicDomain: false,
      openNodePort: false,
      publicDomain: '',
      customDomain: '',
      domain: ''
    }
  ]),
  envs: EnvSchema,
  hpa: HpaSchema,
  secret: SecretSchema,
  configMapList: ConfigMapSchema,
  storeList: StoreSchema,
  labels: z.record(z.string()).default({}),
  volumes: z.array(z.any()).default([]),
  volumeMounts: z.array(z.any()).default([]),
  kind: z.enum(['deployment', 'statefulset']).default('deployment')
});

//------ export schema ------
export const CreateAppRequestSchema = z.object({
  appForm: AppEditSchema
});

export const GetAppByAppNameQuerySchema = z.object({
  appName: z.string().min(1, { message: 'appName 不能为空' })
});

export const GetAppByAppNameResponseSchema = z.array(z.any()).nullable();

export const DeleteAppByNameQuerySchema = z.object({
  name: z.string().min(1, { message: '应用名称不能为空' })
});

export const DeleteAppByNameResponseSchema = z.object({
  message: z.string()
});
