import { z } from 'zod';

export const WorkspaceQuotaItemTypeSchema = z.enum([
  'cpu',
  'memory',
  'storage',
  'gpu',
  'traffic',
  'nodeport'
]);
export type WorkspaceQuotaItemType = z.infer<typeof WorkspaceQuotaItemTypeSchema>;

export const WorkspaceQuotaItemSchema = z.object({
  type: z.enum(['cpu', 'memory', 'storage', 'gpu', 'traffic', 'nodeport']),
  used: z.number(),
  limit: z.number()
});
export type WorkspaceQuotaItem = z.infer<typeof WorkspaceQuotaItemSchema>;

export const ExceededWorkspaceQuotaItemSchema = WorkspaceQuotaItemSchema.extend({
  request: z.number().optional()
});
export type ExceededWorkspaceQuotaItem = z.infer<typeof ExceededWorkspaceQuotaItemSchema>;
