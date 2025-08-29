import { z } from 'zod';

export const WorkspaceQuotaRequestSchema = z.object({
  regionUid: z.string(),
  workspace: z.string()
});
export type WorkspaceQuotaRequest = z.infer<typeof WorkspaceQuotaRequestSchema>;

export const UserQuotaItemSchema = z.object({
  type: z.enum(['cpu', 'memory', 'storage', 'gpu']),
  used: z.number(),
  limit: z.number()
});
export type UserQuotaItem = z.infer<typeof UserQuotaItemSchema>;

export const WorkspaceQuotaResponseSchema = z.object({
  quota: z.array(UserQuotaItemSchema)
});
export type WorkspaceQuotaResponse = z.infer<typeof WorkspaceQuotaResponseSchema>;
