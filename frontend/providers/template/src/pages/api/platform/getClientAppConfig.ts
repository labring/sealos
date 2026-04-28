import { jsonRes } from '@/services/backend/response';
import { ClientAppConfigSchema } from '@/types/config';
import { parseTemplateCategories } from '@/utils/template';
import type { NextApiRequest, NextApiResponse } from 'next';

export function getClientAppConfigServer() {
  return ClientAppConfigSchema.parse({
    brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Sealos',
    desktopDomain: process.env.DESKTOP_DOMAIN || process.env.SEALOS_CLOUD_DOMAIN || '',
    currencySymbolType:
      process.env.CURRENCY_SYMBOL === 'cny' || process.env.CURRENCY_SYMBOL === 'usd'
        ? process.env.CURRENCY_SYMBOL
        : 'shellCoin',
    categories: parseTemplateCategories(process.env.TEMPLATE_CATEGORIES),
    showAuthor: process.env.SHOW_AUTHOR === 'true',
    carousel: {
      enabled: false,
      slides: []
    }
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  jsonRes(res, {
    code: 200,
    data: getClientAppConfigServer()
  });
}
