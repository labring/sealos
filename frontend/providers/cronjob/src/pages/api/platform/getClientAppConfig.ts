import { Config } from '@/config';
import { jsonRes } from '@/services/backend/response';
import { ClientAppConfigSchema } from '@/types/config';
import {
  isServerMisconfiguredError,
  validateClientAppConfigOrThrow
} from '@sealos/shared/server/config';
import type { NextApiRequest, NextApiResponse } from 'next';

export function getClientAppConfigServer() {
  const fullConfig = Config();
  return validateClientAppConfigOrThrow(ClientAppConfigSchema, {
    domain: fullConfig.cloud.domain,
    desktopDomain: fullConfig.cloud.desktopDomain,
    components: {
      applaunchpad: {
        url:
          fullConfig.cronjob.components.applaunchpad.url ||
          `https://applaunchpad.${fullConfig.cloud.domain}`
      }
    },
    podResources: fullConfig.cronjob.podResources,
    jobHistory: fullConfig.cronjob.jobHistory
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    jsonRes(res, { code: 200, data: getClientAppConfigServer() });
  } catch (error) {
    if (isServerMisconfiguredError(error)) {
      return jsonRes(res, { code: 500, message: 'Server misconfigured' });
    }
    console.error('[Client App Config] Unexpected server error:', error);
    return jsonRes(res, { code: 500, message: 'Internal Server Error' });
  }
}
