import request from '@/service/request';
import { ApiResp } from '@/types/api';

export interface AppListResponse {
  appMap: Record<string, string>;
}

// Get app list for billing
export const getAppList = () => request<any, ApiResp<AppListResponse>>('/api/billing/getAppList');
