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

// Schema for MonitorDataResult
const MonitorDataResultSchema = z.object({
  name: z.string().optional(),
  xData: z.array(z.number()),
  yData: z.array(z.string())
});

// Schema for GpuType
const GpuTypeSchema = z
  .object({
    manufacturers: z.string(),
    type: z.string(),
    amount: z.number()
  })
  .optional();

// Schema for AppStatusMapType
const AppStatusMapTypeSchema = z.object({
  label: z.string(),
  value: z.string(),
  color: z.string(),
  backgroundColor: z.string(),
  dotColor: z.string()
});

// Schema for TAppSource
const TAppSourceSchema = z.object({
  hasSource: z.boolean(),
  sourceName: z.string(),
  sourceType: z.string()
});

// Schema for AppListItemType
export const AppListItemTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: AppStatusMapTypeSchema,
  isPause: z.boolean(),
  createTime: z.string(),
  cpu: z.number(),
  memory: z.number(),
  gpu: GpuTypeSchema,
  usedCpu: MonitorDataResultSchema,
  usedMemory: MonitorDataResultSchema,
  activeReplicas: z.number(),
  minReplicas: z.number(),
  maxReplicas: z.number(),
  storeAmount: z.number(),
  labels: z.record(z.string()),
  source: TAppSourceSchema
});

export const GetAppsResponseSchema = z.array(AppListItemTypeSchema);

// Schema for PodStatusMapType
const PodStatusMapTypeSchema = z.object({
  label: z.string(),
  value: z.string(),
  color: z.string(),
  reason: z.string().optional(),
  message: z.string().optional()
});

// Query params schema for GetAppPodsByAppName
export const GetAppPodsByAppNameQuerySchema = z.object({
  name: z.string().min(1, { message: 'App name cannot be empty' })
});

// Schema for PodDetailType
const PodDetailTypeSchema = z
  .object({
    podName: z.string(),
    status: PodStatusMapTypeSchema,
    nodeName: z.string(),
    ip: z.string(),
    restarts: z.number(),
    age: z.string(),
    usedCpu: MonitorDataResultSchema,
    usedMemory: MonitorDataResultSchema,
    cpu: z.number(),
    memory: z.number(),
    podReason: z.string().optional(),
    podMessage: z.string().optional(),
    containerStatus: PodStatusMapTypeSchema
  })
  .and(z.record(z.any())); // Using z.record(z.any()) to cover other fields from V1Pod

// Response schema for GetAppPodsByAppName
export const GetAppPodsByAppNameResponseSchema = z.array(PodDetailTypeSchema);
