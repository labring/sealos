import { BackupTypeEnum, BackupStatusEnum } from '@/constants/backup';
import * as z from 'zod';

export const autoBackupTypeSchema = z.union([
  z.literal('day'),
  z.literal('hour'),
  z.literal('week')
]);

export const autoBackupFormSchema = z.object({
  start: z.boolean(),
  type: autoBackupTypeSchema,
  week: z.array(z.string()),
  hour: z.string(),
  minute: z.string(),
  saveTime: z.number(),
  saveType: z.string()
});

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

// Lowercase status enum for API responses
export const backupStatusEnumLowercaseSchema = z.enum([
  'completed',
  'inprogress',
  'failed',
  'unknow',
  'running',
  'deleting'
]);

// export const backupStatusMapSchema = z.object({
//   label: z.string(),
//   value: backupStatusEnumSchema
// });
export const backupBaseSchema = z.object({
  name: z.string(),
  namespace: z.string(),
  connectionPassword: z.string()
});

export const backupInfoSchema = z
  .object({
    id: z.string(),
    // remark: z.string(),
    status: backupStatusEnumSchema,
    startTime: z.date(),
    // failureReason: z.string().optional(),
    type: backupTypeEnumSchema
  })
  .and(backupBaseSchema);
