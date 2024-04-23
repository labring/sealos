import type {NextApiRequest, NextApiResponse} from 'next';
import {jsonRes} from '@/services/backend/response';
import type {FormSliderListType} from '@/types';
import {readFileSync} from 'fs';
import {Coin, defaultSliderKey} from '@/constants/app';
import * as yaml from 'js-yaml';


export type Response = {
  SEALOS_DOMAIN: string;
  DOMAIN_PORT: string;
  INGRESS_SECRET: string;
  SHOW_EVENT_ANALYZE: boolean;
  FORM_SLIDER_LIST_CONFIG: FormSliderListType;
  CURRENCY: Coin;
};

export const defaultVal = {
  [defaultSliderKey]: {
    cpu: [100, 200, 500, 1000, 2000, 3000, 4000, 8000],
    memory: [64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384]
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!global.FormSliderListConfig) {
      const filename =
        process.env.NODE_ENV === 'development'
          ? 'data/form_slider_config.yaml'
          : '/app/data/form_slider_config.yaml';

      const res: any = yaml.load(readFileSync(filename, 'utf-8'));
      console.log(res);

      global.FormSliderListConfig = res;
    }
  } catch (error) {
    console.log('error: /api/platform/getInitData', error);

    global.FormSliderListConfig = defaultVal;
  }
  jsonRes<Response>(res, {
    data: {
      SEALOS_DOMAIN: process.env.SEALOS_DOMAIN || 'cloud.sealos.io',
      DOMAIN_PORT: process.env.DOMAIN_PORT || '',
      INGRESS_SECRET: process.env.INGRESS_SECRET || 'wildcard-cert',
      SHOW_EVENT_ANALYZE: !!process.env.FASTGPT_KEY,
      FORM_SLIDER_LIST_CONFIG: global.FormSliderListConfig,
      CURRENCY: (process.env['CURRENCY'] || Coin.shellCoin) as Coin
    }
  });
}
