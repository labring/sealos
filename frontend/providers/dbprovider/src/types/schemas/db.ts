import { BackupStatusEnum, BackupTypeEnum } from '@/constants/backup';
import { DBTypeEnum } from '@/constants/db';
import * as z from 'zod';
import { autoBackupFormSchema, backupInfoSchema } from './backup';
import { CPUResourceEnum, MemoryResourceEnum, ReplicasResourceEnum } from '../db';

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
  cpu: z.custom<CPUResourceEnum>((val) => [0.5, 1, 2, 3, 4, 5, 6, 7, 8].includes(val as number)),
  memory: z.custom<MemoryResourceEnum>((val) =>
    [0.5, 1, 2, 4, 6, 8, 12, 16, 32].includes(val as number)
  ),
  storage: z.number().min(1).max(300)
});
export const allResourceSchema = baseResourceSchema.and(
  z.object({
    replicas: z.custom<ReplicasResourceEnum>((val) => [1, 2, 3].includes(val as number))
  })
);
export const dbEditSchema = z.object({
  terminationPolicy: kubeBlockClusterTerminationPolicySchema,
  name: z.string(),
  type: dbTypeSchema,
  version: z.string(),
  resource: allResourceSchema,
  autoBackup: autoBackupFormSchema.optional()
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
    source: dbSourceSchema
  })
);
export const dblistItemSchema = dbEditSchema.and(
  z.object({
    id: z.string(),
    status: dbStatusSchema,
    createTime: z.string(),
    totalResource: baseResourceSchema,
    isDiskSpaceOverflow: z.boolean(),
    source: dbSourceSchema
    // autoBackup: autoBackupFormSchema.optional()
  })
);

export const versionListSchema = z.record(dbTypeSchema, z.array(z.string()));
