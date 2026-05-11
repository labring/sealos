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
  'mysql',
  'redis',
  'kafka',
  'qdrant',
  'nebula',
  'weaviate',
  'milvus',
  'pulsar',
  'clickhouse'
]);

export const kubeBlockClusterTerminationPolicySchema = z.enum(['delete', 'wipeout']);

export const baseResourceSchema = z.object({
  cpu: z.number().min(0.1).max(32).default(0.5),
  memory: z.number().min(0.1).max(32).default(0.5),
  storage: z.number().min(1).max(300).default(3)
});

export const allResourceSchema = baseResourceSchema.and(
  z.object({
    replicas: z.number().min(1).max(20).default(3)
  })
);

export const dbEditSchema = z.object({
  terminationPolicy: kubeBlockClusterTerminationPolicySchema.default('delete').optional(),
  name: z.string().min(1, 'Database name is required'),
  type: dbTypeSchema,
  version: z.string().min(1, 'Database version is required').optional(),
  quota: allResourceSchema,
  autoBackup: autoBackupFormSchema.optional(),
  parameterConfig: z
    .object({
      maxConnections: z.string().optional(),
      timeZone: z.string().optional(),
      lowerCaseTableNames: z.string().optional(),
      maxmemory: z.string().optional()
    })
    .optional()
});

export const dbSourceSchema = z.object({
  hasSource: z.boolean(),
  sourceName: z.string(),
  sourceType: z.enum(['app_store', 'sealaf'])
});

export const dbStatusSchema = z.enum([
  'creating',
  'starting',
  'stopping',
  'stopped',
  'running',
  'updating',
  'specUpdating',
  'rebooting',
  'upgrade',
  'verticalScaling',
  'volumeExpanding',
  'failed',
  'unknown',
  'deleting'
]);

export const dbDetailSchema = dbEditSchema.and(
  z.object({
    id: z.string(),
    status: dbStatusSchema,
    createdAt: z.string(),
    autoBackup: autoBackupFormSchema.optional(),
    uid: z.string(),
    resourceType: z.string().default('cluster'),
    operationalStatus: z.object({}).passthrough().default({}),
    connection: z.object({
      privateConnection: z
        .object({
          endpoint: z.string(),
          host: z.string(),
          port: z.string(),
          username: z.string(),
          password: z.string(),
          connectionString: z.string()
        })
        .nullable(),
      publicConnection: z.string().nullable()
    }),
    pods: z.array(
      z.object({
        name: z.string(),
        status: z.string()
      })
    )
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
    autoBackup: autoBackupFormSchema.optional(),
    uid: z.string(),
    resourceType: z.string().default('cluster'),
    operationalStatus: z.object({}).optional(),
    connection: z.object({
      privateConnection: z
        .object({
          endpoint: z.string(),
          host: z.string(),
          port: z.string(),
          username: z.string(),
          password: z.string(),
          connectionString: z.string()
        })
        .nullable(),
      publicConnection: z.string().nullable()
    }),
    pods: z.array(
      z.object({
        name: z.string(),
        status: z.string()
      })
    )
  })
);

export const updateResourceSchema = z.object({
  cpu: z.number().min(0.1).max(32).optional(),
  memory: z.number().min(0.1).max(32).optional(),
  storage: z.number().min(1).max(300).optional(),
  replicas: z.number().min(1).max(20).optional()
});

export const versionListSchema = z.object({
  postgresql: z.array(z.string()),
  mongodb: z.array(z.string()),
  'apecloud-mysql': z.array(z.string()),
  mysql: z.array(z.string()),
  redis: z.array(z.string()),
  kafka: z.array(z.string()),
  qdrant: z.array(z.string()),
  nebula: z.array(z.string()),
  weaviate: z.array(z.string()),
  milvus: z.array(z.string()),
  pulsar: z.array(z.string()),
  clickhouse: z.array(z.string())
});
