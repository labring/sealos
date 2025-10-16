import { Coin } from '@/constants/app';
import { jsonRes } from '@/services/backend/response';
import type { AppConfigType, EnvResponse } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

process.on('unhandledRejection', (reason, promise) => {
  console.error(`Caught unhandledRejection:`, reason, promise);
});

process.on('uncaughtException', (err) => {
  console.error(`Caught uncaughtException:`, err);
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!global.AppConfig) {
      throw new Error('AppConfig is not correctly loaded!');
    }

    jsonRes<EnvResponse>(res, {
      data: getServerEnv(global.AppConfig)
    });
  } catch (error) {
    console.log('error: /api/platform/getInitData', error);
    jsonRes(res, {
      code: 500,
      error: 'Missing necessary configuration files'
    });
  }
}

export const getServerEnv = (AppConfig: AppConfigType): EnvResponse => {
  return {
    SEALOS_DOMAIN: AppConfig.cloud.domain,
    DOMAIN_PORT: AppConfig.cloud.port?.toString() || '',
    INFRASTRUCTURE_PROVIDER: AppConfig.launchpad.infrastructure.provider,
    REQUIRES_DOMAIN_REG: AppConfig.launchpad.infrastructure.requiresDomainReg,
    DOMAIN_REG_QUERY_LINK: AppConfig.launchpad.infrastructure.domainRegQueryLink,
    DOMAIN_BINDING_DOCUMENTATION_LINK:
      AppConfig.launchpad.infrastructure.domainBindingDocumentationLink,
    SHOW_EVENT_ANALYZE: AppConfig.launchpad.eventAnalyze.enabled,
    FORM_SLIDER_LIST_CONFIG: AppConfig.launchpad.appResourceFormSliderConfig,
    guideEnabled: AppConfig.common.guideEnabled,
    fileMangerConfig: AppConfig.launchpad.fileManger,
    CURRENCY: AppConfig.launchpad.currencySymbol || Coin.shellCoin,
    SEALOS_USER_DOMAINS: AppConfig.cloud.userDomains || [],
    DESKTOP_DOMAIN: AppConfig.cloud.desktopDomain,
    PVC_STORAGE_MAX: AppConfig.launchpad.pvcStorageMax || 20,
    GPU_ENABLED: AppConfig.common.gpuEnabled,
    LOG_ENABLED: !!AppConfig?.launchpad?.components?.log?.url
  };
};
