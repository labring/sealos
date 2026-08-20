import request from '@/service/request';
import { ApiResp } from '@/types/api';
import {
  WorkspaceQuotaRequest,
  WorkspaceQuotaResponse,
  WorkspaceQuotaResponseSchema
} from '@/types/workspace';

export const getWorkspaceQuota = async (data: WorkspaceQuotaRequest) => {
  const res = await request<any, ApiResp<unknown>>('/api/workspace/get-workspace-quota', {
    method: 'POST',
    data
  });

  const parsed = WorkspaceQuotaResponseSchema.safeParse(res?.data);
  if (!parsed.success) throw parsed.error;

  return { ...res, data: parsed.data } as ApiResp<WorkspaceQuotaResponse>;
};
