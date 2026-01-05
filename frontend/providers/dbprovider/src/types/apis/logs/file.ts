import { z } from 'zod';
import { LogTypeEnum } from '@/constants/log';
import { DBTypeEnum } from '@/constants/db';
import { logFileItemSchema, logResultSchema } from '@/types/schemas/logs';

export const query = z.object({
  podName: z.string().nonempty('podName is required'),
  dbType: z
    .enum(DBTypeEnum)
    .extract(['mysql', 'notapemysql', DBTypeEnum.mongodb, DBTypeEnum.redis, DBTypeEnum.postgresql]),
  logType: z.enum(LogTypeEnum)
});

export const response = z.object({
  code: z.number(),
  message: z.string(),
  data: z.array(logFileItemSchema)
});
