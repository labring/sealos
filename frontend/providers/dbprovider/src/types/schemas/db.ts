import * as z from 'zod';
import { autoBackupFormSchema } from './backup';

export const dbTypeSchema = z.enum([
  'postgresql',
  'mongodb',
  'apecloud-mysql',
  'redis',
  'kafka',
  'qdrant',
  'nebula',
  'weaviate',
  'milvus',
  'pulsar',
  'clickhouse'
]);
export const kubeBlockClusterTerminationPolicySchema = z.enum(['Delete', 'WipeOut']);
export const baseResourceSchema = z.object({
  cpu: z
    .enum(['0.5', '1', '2', '3', '4', '5', '6', '7', '8'])
    .pipe(z.coerce.number())
    .default('1' as any),
  memory: z
    .enum(['0.5', '1', '2', '4', '6', '8', '12', '16', '32'])
    .pipe(z.coerce.number())
    .default('1' as any),
  storage: z.number().min(1).max(300).default(3)
});
export const allResourceSchema = baseResourceSchema.and(
  z.object({
    replicas: z.number().min(1).max(3).default(1)
  })
);
export const dbEditSchema = z.object({
  terminationPolicy: kubeBlockClusterTerminationPolicySchema,
  name: z.string(),
  type: dbTypeSchema,
  version: z.string(),
  resource: allResourceSchema
});
// export const dbConditionItemSchema = z.object({
//   lastTransitionTime: z.string(),
//   message: z.string(),
//   observedGeneration: z.number(),
//   reason: z.string(),
//   status: z.enum(['True', 'False']),
//   type: z.string()
// });
export const dbSourceSchema = z.object({
  hasSource: z.boolean(),
  sourceName: z.string(),
  sourceType: z.enum(['app_store', 'sealaf'])
});
export const dbStatusSchema = z.enum([
  'Creating',
  'Starting',
  'Stopping',
  'Stopped',
  'Running',
  'Updating',
  'SpecUpdating',
  'Rebooting',
  'Upgrade',
  'VerticalScaling',
  'VolumeExpanding',
  'Failed',
  'UnKnow',
  'Deleting'
]);
export const dbDetailSchema = dbEditSchema.and(
  z.object({
    id: z.string(),
    status: dbStatusSchema,
    createTime: z.string(),
    totalResource: baseResourceSchema,
    isDiskSpaceOverflow: z.boolean(),
    source: dbSourceSchema,
    autoBackup: autoBackupFormSchema.optional()
  })
);
export const dblistItemSchema = dbEditSchema.and(
  z.object({
    id: z.string(),
    status: dbStatusSchema,
    createTime: z.string(),
    totalResource: baseResourceSchema,
    isDiskSpaceOverflow: z.boolean(),
    source: dbSourceSchema,
    autoBackup: autoBackupFormSchema.optional()
  })
);

export const versionListSchema = z.record(dbTypeSchema, z.array(z.string()));
