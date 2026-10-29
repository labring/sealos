import type { NextApiRequest } from 'next';
import { getCloudConfig } from '@/pages/api/platform/getCloudConfig';
import { getClientIp } from '../requestIp';
import { limitCodeRequests } from '../oauth2/authorization-code';
import { realm } from './config';

export async function acquisitionHttp(req: NextApiRequest) {
  realm();
  if (!global.AppConfig) await getCloudConfig();
  await limitCodeRequests(`acquisition:${getClientIp(req) || 'unknown'}`);
}
