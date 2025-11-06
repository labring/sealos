import { z } from 'zod';

export const WorkspaceQuotaItemSchema = z.object({
  type: z.enum(['cpu', 'memory', 'storage', 'gpu', 'traffic', 'nodeport']),
  used: z.number(),
  limit: z.number()
});
export type WorkspaceQuotaItem = z.infer<typeof WorkspaceQuotaItemSchema>;
