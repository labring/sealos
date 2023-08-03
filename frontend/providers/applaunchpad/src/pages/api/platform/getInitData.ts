import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import type { FormSliderListType } from '@/types';
import { readFileSync } from 'fs';
import { noGpuSliderKey } from '@/constants/app';

export type Response = {
  SEALOS_DOMAIN: string;
  INGRESS_SECRET: string;
  FORM_SLIDER_LIST_CONFIG: FormSliderListType;
};

export const defaultVal = {
  [noGpuSliderKey]: {
    cpu: [100, 200, 500, 1000, 2000, 3000, 4000, 8000],
    memory: [64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384]
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!global.FormSliderListConfig) {
      const filename =
        process.env.NODE_ENV === 'development'
          ? 'data/form_slider_config.json.local'
          : '/app/data/form_slider_config.json';

      const res = JSON.parse(readFileSync(filename, 'utf-8'));
      console.log(res);

      global.FormSliderListConfig = res;
    }
  } catch (error) {
    console.log(error);

    global.FormSliderListConfig = defaultVal;
  }

  jsonRes<Response>(res, {
    data: {
      SEALOS_DOMAIN: process.env.SEALOS_DOMAIN || 'cloud.sealos.io',
      INGRESS_SECRET: process.env.INGRESS_SECRET || 'wildcard-cert',
      FORM_SLIDER_LIST_CONFIG: global.FormSliderListConfig
    }
  });
}
