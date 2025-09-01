import request from '@/service/request';
import { ApiResp } from '@/types/api';
import { WorkspaceConsumptionRequest, WorkspaceConsumptionResponse } from '@/types/billing';

export interface AppListResponse {
  appMap: Record<string, string>;
}

// Get app list for billing
export const getAppList = () => request<any, ApiResp<AppListResponse>>('/api/billing/getAppList');

/**
 * Get workspaces consumption data.
 * Returns consumption amounts grouped by workspace.
 * @param data - Request parameters including time range and optional namespace
 * @returns Promise resolving to workspace consumption data
 */
export const getWorkspacesConsumptions = (data: WorkspaceConsumptionRequest) =>
  request<any, ApiResp<WorkspaceConsumptionResponse>>('/api/billing/workspace-consumption', {
    method: 'POST',
    data
  });
