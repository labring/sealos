import { z } from 'zod';

const baseLogEntrySchema = z.object({
  timestamp: z.string(),
  level: z.string(),
  content: z.string()
});

export const logResultSchema = z.object({
  logs: z.array(baseLogEntrySchema),
  metadata: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    processingTime: z.string(),
    hasMore: z.boolean()
  })
});

export const logFileItemSchema = z.object({
  name: z.string(),
  path: z.string(),
  dir: z.string(),
  kind: z.string(),
  attr: z.string(),
  hardLinks: z.number(),
  owner: z.string(),
  group: z.string(),
  size: z.number(),
  updateTime: z.date(),
  linkTo: z.string().optional(),
  processed: z.boolean().optional()
});
