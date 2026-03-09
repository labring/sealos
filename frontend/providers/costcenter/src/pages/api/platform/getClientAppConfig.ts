import { Config } from '@/config';
import { jsonRes } from '@/service/backend/response';
import { ClientAppConfigSchema, type ClientAppConfig } from '@/types/config';
import type { NextApiRequest, NextApiResponse } from 'next';

export function getClientAppConfigServer(): ClientAppConfig {
  const fullConfig = Config();
  return ClientAppConfigSchema.parse({
    features: {
      rechargeRequiresRealName: fullConfig.costCenter.features.rechargeRequiresRealName,
      transferEnabled: fullConfig.costCenter.features.transfer,
      giftCodeEnabled: fullConfig.costCenter.features.giftCode,
      subscriptionEnabled: fullConfig.costCenter.features.subscription,
      gpuEnabled: fullConfig.costCenter.features.gpu
    },
    currencySymbolType: fullConfig.costCenter.ui.currencySymbolType,
    recharge: fullConfig.costCenter.recharge,
    invoice: {
      enabled: fullConfig.costCenter.invoice.enabled,
      billingInfo: fullConfig.costCenter.invoice.billingInfo
    },
    components: fullConfig.costCenter.components
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  jsonRes(res, { code: 200, data: getClientAppConfigServer() });
}
