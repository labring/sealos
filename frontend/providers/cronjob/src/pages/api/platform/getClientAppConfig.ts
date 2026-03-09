import { Config } from '@/config';
import { jsonRes } from '@/services/backend/response';
import { ClientAppConfigSchema } from '@/types/config';
import type { NextApiRequest, NextApiResponse } from 'next';

export function getClientAppConfigServer() {
  const fullConfig = Config();
  return ClientAppConfigSchema.parse({
    domain: fullConfig.cloud.domain,
    applaunchpadUrl:
      fullConfig.cronjob.applaunchpadUrl || `applaunchpad.${fullConfig.cloud.domain}`,
    podCpuRequest: fullConfig.cronjob.podCpuRequest,
    podMemoryRequest: fullConfig.cronjob.podMemoryRequest,
    successfulJobsHistoryLimit: fullConfig.cronjob.jobHistory.successfulLimit,
    failedJobsHistoryLimit: fullConfig.cronjob.jobHistory.failedLimit
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  jsonRes(res, { code: 200, data: getClientAppConfigServer() });
}
