import { Coin } from '@/constants/app';
import { jsonRes } from '@/services/backend/response';
import type { AppConfigType, FileMangerType, FormSliderListType } from '@/types';
import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import type { NextApiRequest, NextApiResponse } from 'next';

// todo make response type to be more specific and clear.
export type Response = {
  SEALOS_DOMAIN: string;
  DOMAIN_PORT: string;
  INGRESS_SECRET: string;
  SHOW_EVENT_ANALYZE: boolean;
  FORM_SLIDER_LIST_CONFIG: FormSliderListType;
  CURRENCY: Coin;
  guideEnabled: boolean;
  fileMangerConfig: FileMangerType;
};

export const defaultAppConfig: AppConfigType = {
  cloud: {
    domain: 'cloud.sealos.io',
    port: ''
  },
  common: {
    guideEnabled: false,
    apiEnabled: false
  },
  launchpad: {
    ingressTlsSecretName: 'wildcard-cert',
    eventAnalyze: {
      enabled: false,
      fastGPTKey: ''
    },
    components: {
      monitor: {
        url: 'http://launchpad-monitor.sealos.svc.cluster.local:8428'
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
    if (!global.AppConfig || process.env.NODE_ENV !== 'production') {
      const filename =
        process.env.NODE_ENV === 'development' ? 'data/config.yaml.local' : '/app/data/config.yaml';
      const res: any = yaml.load(readFileSync(filename, 'utf-8'));
      console.log(res);
      global.AppConfig = res;
    }
    jsonRes<Response>(res, {
      data: {
        SEALOS_DOMAIN: global.AppConfig.cloud.domain,
        DOMAIN_PORT: global.AppConfig.cloud.port?.toString() || '',
        INGRESS_SECRET: global.AppConfig.launchpad.ingressTlsSecretName,
        SHOW_EVENT_ANALYZE: global.AppConfig.launchpad.eventAnalyze.enabled,
        FORM_SLIDER_LIST_CONFIG: global.AppConfig.launchpad.appResourceFormSliderConfig,
        guideEnabled: global.AppConfig.common.guideEnabled,
        fileMangerConfig: global.AppConfig.launchpad.fileManger,
        CURRENCY: Coin.shellCoin
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
