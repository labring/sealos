import request from '@/service/request';
import { ApiResp } from '@/types/api';
import {
  WorkspaceConsumptionRequest,
  WorkspaceConsumptionResponse,
  RechargeBillingData
} from '@/types/billing';

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

/**
 * Get recharge billing list (the legacy one).
 * Returns recharge payment records within the specified time range.
 * @param data - Request parameters including startTime, endTime (ISO string format), and optional pagination
 * @returns Promise resolving to recharge billing data
 */
export const getRechargeBillingList = (data: {
  startTime: string;
  endTime: string;
  page?: number;
  pageSize?: number;
}) =>
  request<any, ApiResp<RechargeBillingData>>('/api/billing/rechargeBillingList', {
    method: 'POST',
    data
  });
