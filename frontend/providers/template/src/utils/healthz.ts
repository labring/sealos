import { getClientAppConfigServer } from '@/pages/api/platform/getClientAppConfig';
export const HEALTHZ_SERVICE = 'template';

export async function assertReady() {
  await getClientAppConfigServer();
}
