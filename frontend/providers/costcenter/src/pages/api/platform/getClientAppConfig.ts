import { Config } from '@/config';
import { jsonRes } from '@/service/backend/response';
import { ClientAppConfigSchema, type ClientAppConfig } from '@/types/config';
import {
  isServerMisconfiguredError,
  validateClientAppConfigOrThrow
} from '@sealos/shared/server/config';
import type { NextApiRequest, NextApiResponse } from 'next';

export function getClientAppConfigServer(): ClientAppConfig {
  const fullConfig = Config();
  return validateClientAppConfigOrThrow(ClientAppConfigSchema, {
    features: {
      rechargeRequiresRealName: fullConfig.costCenter.features.rechargeRequiresRealName,
      transferEnabled: fullConfig.costCenter.features.transfer,
      giftCodeEnabled: fullConfig.costCenter.features.giftCode,
      subscriptionEnabled: fullConfig.costCenter.features.subscription,
      gpuEnabled: fullConfig.costCenter.features.gpu
    },
    currencySymbol: fullConfig.costCenter.ui.currencySymbol,
    recharge: fullConfig.costCenter.recharge,
    invoice: {
      enabled: fullConfig.costCenter.invoice.enabled,
      billingInfo: fullConfig.costCenter.invoice.billingInfo
    },
    components: {
      billing: { url: fullConfig.costCenter.components.billing.url },
      desktop: { url: fullConfig.costCenter.components.desktop.url }
    }
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    jsonRes(res, { code: 200, data: getClientAppConfigServer() });
  } catch (error) {
    if (isServerMisconfiguredError(error)) {
      return jsonRes(res, { code: 500, message: 'Server misconfigured' });
    }
    console.error('[Client App Config] Unexpected server error:', error);
    return jsonRes(res, { code: 500, message: 'Internal Server Error' });
  }
}
