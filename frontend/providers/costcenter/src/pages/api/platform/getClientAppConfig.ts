import { Config } from '@/config';
import { jsonRes } from '@/service/backend/response';
import { ClientAppConfigSchema, type ClientAppConfig } from '@/types/config';
import type { NextApiRequest, NextApiResponse } from 'next';

export function getClientAppConfigServer(): ClientAppConfig {
  const fullConfig = Config();
  return ClientAppConfigSchema.parse({
    realNameRechargeLimit: fullConfig.costCenter.realNameRechargeLimit,
    rechargeEnabled: fullConfig.costCenter.recharge.enabled,
    transferEnabled: fullConfig.costCenter.transferEnabled,
    giftCodeEnabled: fullConfig.costCenter.giftCodeEnabled,
    currency: fullConfig.costCenter.currencyType,
    subscriptionEnabled: fullConfig.costCenter.subscriptionEnabled,
    stripeEnabled: fullConfig.costCenter.recharge.payMethods.stripe.enabled,
    stripePublicKey: fullConfig.costCenter.recharge.payMethods.stripe.publicKey,
    wechatEnabled: fullConfig.costCenter.recharge.payMethods.wechat.enabled,
    alipayEnabled: fullConfig.costCenter.recharge.payMethods.alipay.enabled,
    invoiceEnabled: fullConfig.costCenter.invoice.enabled,
    gpuEnabled: fullConfig.costCenter.gpuEnabled,
    billingInfo: fullConfig.costCenter.invoice.billingInfo,
    accountServiceUrl: fullConfig.costCenter.components.accountService.url,
    desktopServiceUrl: fullConfig.costCenter.components.desktopService.url
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  jsonRes(res, { code: 200, data: getClientAppConfigServer() });
}
