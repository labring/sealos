import request from '@/service/request';
import { ApiResp } from '@/types/api';
import { Response as AppConfigResponse } from '@/pages/api/platform/getAppConfig';

// Get app configuration
export const getAppConfig = () =>
  request<any, ApiResp<AppConfigResponse>>('/api/platform/getAppConfig');
