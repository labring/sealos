import { Config } from '@/config';
import { jsonRes } from '@/services/backend/response';
import { ClientAppConfigSchema } from '@/types/config';
import type { NextApiRequest, NextApiResponse } from 'next';

export function getClientAppConfigServer() {
  const fullConfig = Config();
  return ClientAppConfigSchema.parse({
    domain: fullConfig.cloud.domain,
    port: fullConfig.cloud.port,
    userDomains: fullConfig.cloud.userDomains,
    desktopDomain: fullConfig.cloud.desktopDomain,
    guideEnabled: fullConfig.launchpad.guideEnabled,
    apiEnabled: fullConfig.launchpad.apiEnabled,
    gpuEnabled: fullConfig.launchpad.gpuEnabled,
    infrastructure: fullConfig.launchpad.infrastructure,
    currencySymbol: fullConfig.launchpad.currencySymbol,
    pvcStorageMax: fullConfig.launchpad.pvcStorageMax,
    eventAnalyze: fullConfig.launchpad.eventAnalyze,
    components: fullConfig.launchpad.components,
    appResourceFormSliderConfig: fullConfig.launchpad.appResourceFormSliderConfig,
    fileManger: fullConfig.launchpad.fileManger,
    meta: {
      title: fullConfig.launchpad.meta.title,
      description: fullConfig.launchpad.meta.description
    },
    gtmId: fullConfig.launchpad.gtmId
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  jsonRes(res, { code: 200, data: getClientAppConfigServer() });
}
