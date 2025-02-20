import { Coin } from '@/constants/app';
import { jsonRes } from '@/services/backend/response';
import type { AppConfigType, FileMangerType, FormSliderListType } from '@/types';
import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getGpuNode } from './resourcePrice';

// todo make response type to be more specific and clear.
export type Response = {
  SEALOS_DOMAIN: string;
  DOMAIN_PORT: string;
  SHOW_EVENT_ANALYZE: boolean;
  FORM_SLIDER_LIST_CONFIG: FormSliderListType;
  CURRENCY: Coin;
  guideEnabled: boolean;
  fileMangerConfig: FileMangerType;
  SEALOS_USER_DOMAINS: { name: string; secretName: string }[];
  DESKTOP_DOMAIN: string;
  PVC_STORAGE_MAX: number;
  GPU_ENABLED: boolean;
};

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
      console.log(res);
      global.AppConfig = res;
      const gpuNodes = await getGpuNode();
      console.log(gpuNodes, 'gpuNodes');
      global.AppConfig.common.gpuEnabled = gpuNodes.length > 0;
    }

    jsonRes<Response>(res, {
      data: {
        SEALOS_DOMAIN: global.AppConfig.cloud.domain,
        DOMAIN_PORT: global.AppConfig.cloud.port?.toString() || '',
        SHOW_EVENT_ANALYZE: global.AppConfig.launchpad.eventAnalyze.enabled,
        FORM_SLIDER_LIST_CONFIG: global.AppConfig.launchpad.appResourceFormSliderConfig,
        guideEnabled: global.AppConfig.common.guideEnabled,
        fileMangerConfig: global.AppConfig.launchpad.fileManger,
        CURRENCY: global.AppConfig.launchpad.currencySymbol || Coin.shellCoin,
        SEALOS_USER_DOMAINS: global.AppConfig.cloud.userDomains || [],
        DESKTOP_DOMAIN: global.AppConfig.cloud.desktopDomain,
        PVC_STORAGE_MAX: global.AppConfig.launchpad.pvcStorageMax || 20,
        GPU_ENABLED: global.AppConfig.common.gpuEnabled
      }
    });
  } catch (error) {
    console.log('error: /api/platform/getInitData', error);
    jsonRes(res, {
      code: 500,
      error: 'Missing necessary configuration files'
    });
  }
}
