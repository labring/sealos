import { getAppConfigResponse, initAppConfig } from '@/pages/api/platform/getAppConfig';
export const HEALTHZ_SERVICE = 'costcenter';

export function assertReady() {
  initAppConfig();
  getAppConfigResponse();
}
