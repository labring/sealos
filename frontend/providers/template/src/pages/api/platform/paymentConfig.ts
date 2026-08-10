import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import {
  getRuntimeCloudPort,
  getRuntimeDesktopDomain,
  readRuntimeAppConfig
} from '@/utils/appConfig';

type CostCenterConfigResponse = {
  code: number;
  data?: {
    RECHARGE_ENABLED?: boolean;
    STRIPE_ENABLED?: boolean;
    WECHAT_ENABLED?: boolean;
    ALIPAY_ENABLED?: boolean;
  };
};

export type PaymentConfigResponse = {
  paymentEnabled: boolean;
};

const getCostCenterConfigUrl = () => {
  const config = readRuntimeAppConfig();
  const domain = getRuntimeDesktopDomain(config);
  const port = getRuntimeCloudPort(config);
  const portSuffix = port && port !== '443' && port !== '80' ? `:${port}` : '';

  return `https://costcenter.${domain}${portSuffix}/api/platform/getAppConfig`;
};

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const response = await fetch(getCostCenterConfigUrl());

    if (!response.ok) {
      throw new Error(`CostCenter config request failed with status ${response.status}`);
    }

    const result = (await response.json()) as CostCenterConfigResponse;
    const config = result.data;
    const hasPaymentMethod =
      !!config?.STRIPE_ENABLED || !!config?.WECHAT_ENABLED || !!config?.ALIPAY_ENABLED;

    jsonRes<PaymentConfigResponse>(res, {
      data: {
        paymentEnabled: !!config?.RECHARGE_ENABLED && hasPaymentMethod
      }
    });
  } catch (error) {
    console.log('error: /api/platform/paymentConfig', error);
    jsonRes<PaymentConfigResponse>(res, {
      data: {
        paymentEnabled: false
      }
    });
  }
}
