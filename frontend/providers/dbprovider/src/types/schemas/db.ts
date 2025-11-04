import * as z from 'zod';

export const backupTypeSchema = z.enum(['day', 'hour', 'week']);
export const weekDaySchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
]);
export const saveTypeSchema = z.enum(['days', 'weeks', 'months', 'hours']);

export const autoBackupFormSchema = z
  .object({
    start: z.boolean().default(false),
    type: backupTypeSchema.default('day'),
    week: z.array(weekDaySchema).default(['monday']),
    hour: z.string().default('02'),
    minute: z.string().default('00'),
    saveTime: z.number().min(1).max(365).default(1),
    saveType: saveTypeSchema.default('days')
  })
  .refine(
    (data) => {
      if (data.start) {
        if (data.type === 'day' || data.type === 'hour') {
          const hour = parseInt(data.hour);
          const minute = parseInt(data.minute);
          if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            return false;
          }
        }

        if (data.type === 'week') {
          if (!data.week || data.week.length === 0) {
            return false;
          }

          const hasValidWeek = data.week.some((w) =>
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(
              w
            )
          );
          if (!hasValidWeek) {
            return false;
          }
        }
      }
      return true;
    },
    {
      message: 'Invalid backup configuration'
    }
  );

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
    .number()
    .refine((val) => [0.5, 1, 2, 3, 4, 5, 6, 7, 8].includes(val), {
      message: 'CPU must be one of: 0.5, 1, 2, 3, 4, 5, 6, 7, 8 cores (minimum 0.5 core)'
    })
    .default(0.5),
  memory: z
    .number()
    .refine((val) => [0.5, 1, 2, 4, 6, 8, 12, 16, 32].includes(val), {
      message: 'Memory must be one of: 0.5, 1, 2, 4, 6, 8, 12, 16, 32 GB (minimum 0.5 GB)'
    })
    .default(0.5),
  storage: z.number().min(1).max(300).default(3)
});

export const allResourceSchema = baseResourceSchema.and(
  z.object({
    replicas: z.number().min(1).max(20).default(3)
  })
);

export const dbEditSchema = z.object({
  terminationPolicy: kubeBlockClusterTerminationPolicySchema,
  name: z.string().min(1, 'Database name is required'),
  type: dbTypeSchema,
  version: z.string().min(1, 'Database version is required'),
  resource: allResourceSchema,
  autoBackup: autoBackupFormSchema.optional(),
  parameterConfig: z
    .object({
      maxConnections: z.string().optional(),
      timeZone: z.string().optional(),
      lowerCaseTableNames: z.string().optional()
    })
    .optional()
});

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

export const updateResourceSchema = z.object({
  cpu: z
    .number()
    .refine((val) => [0.5, 1, 2, 3, 4, 5, 6, 7, 8].includes(val), {
      message: 'CPU must be one of: 0.5, 1, 2, 3, 4, 5, 6, 7, 8 cores (minimum 0.5 core)'
    })
    .optional(),
  memory: z
    .number()
    .refine((val) => [0.5, 1, 2, 4, 6, 8, 12, 16, 32].includes(val), {
      message: 'Memory must be one of: 0.5, 1, 2, 4, 6, 8, 12, 16, 32 GB (minimum 0.5 GB)'
    })
    .optional(),
  storage: z.number().min(1).max(300).optional(),
  replicas: z.number().min(1).max(20).optional()
});

export const versionListSchema = z.record(dbTypeSchema, z.array(z.string()));
