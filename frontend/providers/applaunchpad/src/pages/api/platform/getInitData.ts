import { Coin } from '@/constants/app';
import { jsonRes } from '@/services/backend/response';
import type { AppConfigType, EnvResponse } from '@/types';
import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getGpuNode } from './resourcePrice';

export const defaultAppConfig: AppConfigType = {
  cloud: {
    domain: 'cloud.sealos.io',
    port: '',
    userDomains: [
      {
        name: 'cloud.sealos.io',
        secretName: 'wildcard-cert'
      }
    ],
    desktopDomain: 'cloud.sealos.io'
  },
  common: {
    guideEnabled: false,
    apiEnabled: false,
    gpuEnabled: false
  },
  launchpad: {
    infrastructure: {
      provider: 'alibaba',
      requiresDomainReg: false,
      domainRegQueryLink: 'http://localhost:3000',
      domainBindingDocumentationLink: null
    },
    meta: {
      title: 'Sealos Desktop App Demo',
      description: 'Sealos Desktop App Demo',
      scripts: []
    },
    currencySymbol: Coin.shellCoin,
    pvcStorageMax: 20,
    eventAnalyze: {
      enabled: false,
      fastGPTKey: ''
    },
    components: {
      monitor: {
        url: 'http://launchpad-monitor.sealos.svc.cluster.local:8428'
      },
      billing: {
        url: 'http://account-service.account-system.svc:2333'
      },
      log: {
        url: 'http://localhost:8080'
      }
    },
    appResourceFormSliderConfig: {
      default: {
        cpu: [100, 200, 500, 1000, 2000, 3000, 4000, 8000],
        memory: [64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384]
      }
    },
    fileManger: {
      uploadLimit: 5,
      downloadLimit: 100
    }
  }
};

process.on('unhandledRejection', (reason, promise) => {
  console.error(`Caught unhandledRejection:`, reason, promise);
});

process.on('uncaughtException', (err) => {
  console.error(`Caught uncaughtException:`, err);
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!global.AppConfig) {
      const filename =
        process.env.NODE_ENV === 'development' ? 'data/config.yaml.local' : '/app/data/config.yaml';
      const res: any = yaml.load(readFileSync(filename, 'utf-8'));
      const config = {
        ...defaultAppConfig,
        ...res
      };
      global.AppConfig = config;
      const gpuNodes = await getGpuNode();
      console.log(gpuNodes, 'gpuNodes');
      global.AppConfig.common.gpuEnabled = gpuNodes.length > 0;
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
    GPU_ENABLED: AppConfig.common.gpuEnabled
  };
};
