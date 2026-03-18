import * as z from 'zod';
export const queryParams = z.object({
  databaseName: z.string().min(1, 'Database name is required')
});

export const response = z.object({
  data: z
    .object({
      dbName: z.string(),
      serviceName: z.string(),
      operation: z.literal('disable-public-access'),
      deletedAt: z.string()
    })
    .optional()
});
