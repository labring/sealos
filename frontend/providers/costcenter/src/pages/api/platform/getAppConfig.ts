import type { NextApiRequest, NextApiResponse } from 'next';
import * as yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { jsonRes } from '@/service/backend/response';

export type Response = {
  RECHARGE_ENABLED: boolean;
  TRANSFER_ENABLED: boolean;
  STRIPE_ENABLED: boolean;
  STRIPE_PUB: string;
  WECHAT_ENABLED: boolean;
  CURRENCY: 'shellCoin' | 'cny' | 'usd';
  INVOICE_ENABLED: boolean;
  GPU_ENABLED: boolean;
};

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
        RECHARGE_ENABLED: global.AppConfig.recharge.enabled,
        TRANSFER_ENABLED: global.AppConfig.transferEnabled,
        STRIPE_ENABLED: global.AppConfig.recharge.payMethods.stripe.enabled,
        STRIPE_PUB: global.AppConfig.recharge.payMethods.stripe.publicKey,
        WECHAT_ENABLED: global.AppConfig.recharge.payMethods.wechat.enabled,
        CURRENCY: global.AppConfig.currencyType,
        INVOICE_ENABLED: global.AppConfig.invoice.enabled,
        GPU_ENABLED: global.AppConfig.gpuEnabled
      } as Response
    });
  } catch (error) {
    console.log('error: /api/platform/getInitData', error);
    jsonRes(res, {
      code: 500,
      error: 'Missing necessary configuration files'
    });
  }
}
