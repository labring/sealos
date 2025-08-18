import { BackupStatusEnum, BackupTypeEnum } from '@/constants/backup';
import { DBTypeEnum } from '@/constants/db';
import * as z from 'zod';
import { autoBackupFormSchema } from './backup';

export const dbTypeSchema = z.enum([
  DBTypeEnum.postgresql,
  DBTypeEnum.mongodb,
  DBTypeEnum.mysql,
  DBTypeEnum.redis,
  DBTypeEnum.kafka,
  DBTypeEnum.qdrant,
  DBTypeEnum.nebula,
  DBTypeEnum.weaviate,
  DBTypeEnum.milvus,
  DBTypeEnum.pulsar,
  DBTypeEnum.clickhouse
]);

export const kubeBlockClusterTerminationPolicySchema = z.union([
  z.literal('Delete'),
  z.literal('WipeOut')
]);

export const backupTypeEnumSchema = z.enum([
  BackupTypeEnum.manual,
  BackupTypeEnum.auto,
  BackupTypeEnum.UnKnow
]);

export const backupStatusEnumSchema = z.enum([
  BackupStatusEnum.Completed,
  BackupStatusEnum.InProgress,
  BackupStatusEnum.Failed,
  BackupStatusEnum.UnKnow,
  BackupStatusEnum.Running,
  BackupStatusEnum.Deleting
]);

export const backupStatusMapSchema = z.object({
  label: z.string(),
  value: backupStatusEnumSchema,
  color: z.string()
});

export const backupItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  remark: z.string(),
  status: backupStatusMapSchema,
  startTime: z.date(),
  failureReason: z.string().optional(),
  type: backupTypeEnumSchema,
  namespace: z.string(),
  connectionPassword: z.string(),
  dbName: z.string(),
  dbType: z.string()
});

export const dbEditSchema = z.object({
  dbType: dbTypeSchema,
  dbVersion: z.string(),
  dbName: z.string(),
  replicas: z.number(),
  cpu: z.number(),
  memory: z.number(),
  storage: z.number(),
  labels: z.record(z.string(), z.string()),
  terminationPolicy: kubeBlockClusterTerminationPolicySchema,
  autoBackup: z.optional(autoBackupFormSchema),
  parameterConfig: z.optional(
    z.object({
      walLevel: z.string(),
      sharedPreloadLibraries: z.string()
    })
  )
});
