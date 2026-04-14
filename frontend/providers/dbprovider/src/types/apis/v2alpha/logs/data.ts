import { z } from 'zod';
import { LogTypeEnum } from '@/constants/log';
import { DBTypeEnum } from '@/constants/db';
import { logResultSchema } from '@/types/schemas/logs';

export const query = z.object({
  podName: z.string().nonempty('podName is required'),
  dbType: z
    .enum(DBTypeEnum)
    .extract(['mysql', 'notapemysql', DBTypeEnum.mongodb, DBTypeEnum.redis, DBTypeEnum.postgresql]),
  logType: z.enum(LogTypeEnum),
  logPath: z.string().nonempty('logPath is required'),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).optional()
});

export const response = z.object({
  code: z.number(),
  message: z.string(),
  data: logResultSchema
});
