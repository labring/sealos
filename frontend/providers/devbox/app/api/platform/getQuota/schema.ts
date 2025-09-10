import { z } from 'zod';
import { WorkspaceQuotaItemSchema } from '@/types/workspace';

export const GetQuotaResponseSchema = z.object({
  data: z.object({
    quota: z.array(WorkspaceQuotaItemSchema)
  })
});
export type GetQuotaResponse = z.infer<typeof GetQuotaResponseSchema>;
