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
    guideEnabled: fullConfig.launchpad.features.guide,
    apiEnabled: fullConfig.launchpad.features.api,
    gpuEnabled: fullConfig.launchpad.features.gpu,
    infrastructure: fullConfig.launchpad.infrastructure,
    currencySymbol: fullConfig.launchpad.ui.currencySymbol,
    pvcStorageMax: fullConfig.launchpad.pvcStorageMax,
    analytics: fullConfig.launchpad.analytics,
    components: fullConfig.launchpad.components,
    appResourceFormSliderConfig: fullConfig.launchpad.ui.appResourceFormSliderConfig,
    fileManager: fullConfig.launchpad.fileManager,
    meta: {
      title: fullConfig.launchpad.ui.meta.title,
      description: fullConfig.launchpad.ui.meta.description
    }
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  jsonRes(res, { code: 200, data: getClientAppConfigServer() });
}
