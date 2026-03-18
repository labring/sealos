import { Config } from '@/config';
import { jsonRes } from '@/services/backend/response';
import { ClientAppConfigSchema } from '@/types/config';
import type { NextApiRequest, NextApiResponse } from 'next';

export function getClientAppConfigServer() {
  const fullConfig = Config();
  return ClientAppConfigSchema.parse({
    brandName: fullConfig.template.ui.brandName,
    desktopDomain: fullConfig.template.desktopDomain,
    currencySymbolType: fullConfig.template.ui.currencySymbolType,
    showAuthor: fullConfig.template.features.showAuthor,
    carousel: fullConfig.template.ui.carousel
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  jsonRes(res, {
    code: 200,
    data: getClientAppConfigServer()
  });
}
