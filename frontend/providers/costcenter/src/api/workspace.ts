import request from '@/service/request';
import { ApiResp } from '@/types/api';
import { WorkspaceQuotaRequest, WorkspaceQuotaResponse } from '@/types/workspace';

export const getWorkspaceQuota = (data: WorkspaceQuotaRequest) =>
  request<any, ApiResp<WorkspaceQuotaResponse>>('/api/workspace/get-workspace-quota', {
    method: 'POST',
    data
  });
