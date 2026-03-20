import { z } from 'zod';
import { QuantitySchema } from '@sealos/shared';

export const WorkspaceQuotaRequestSchema = z.object({
  regionUid: z.string(),
  workspace: z.string()
});
export type WorkspaceQuotaRequest = z.infer<typeof WorkspaceQuotaRequestSchema>;

export const UserQuotaItemSchema = z.object({
  type: z.enum(['cpu', 'memory', 'storage', 'gpu', 'traffic', 'nodeport']),
  used: QuantitySchema,
  limit: QuantitySchema
});
export type UserQuotaItem = z.infer<typeof UserQuotaItemSchema>;

export const WorkspaceQuotaResponseSchema = z.object({
  quota: z.array(UserQuotaItemSchema)
});
export type WorkspaceQuotaResponse = z.infer<typeof WorkspaceQuotaResponseSchema>;
