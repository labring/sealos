import { Config } from '@/config';
import { jsonRes } from '@/services/backend/response';
import { ClientAppConfigSchema } from '@/types/config';
import type { NextApiRequest, NextApiResponse } from 'next';

export function getClientAppConfigServer() {
  const fullConfig = Config();
  return ClientAppConfigSchema.parse({
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
  jsonRes(res, { code: 200, data: getClientAppConfigServer() });
}
