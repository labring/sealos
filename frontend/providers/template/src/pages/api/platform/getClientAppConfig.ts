import { jsonRes } from '@/services/backend/response';
import { ClientAppConfigSchema } from '@/types/config';
import {
  getRuntimeCategories,
  getRuntimeCurrencySymbol,
  getRuntimeDesktopDomain,
  readRuntimeAppConfig
} from '@/utils/appConfig';
import { parseTemplateCategories } from '@/utils/template';
import type { NextApiRequest, NextApiResponse } from 'next';

export function getClientAppConfigServer() {
  const config = readRuntimeAppConfig();
  const templateConfig = config.template;
  const uiConfig = templateConfig?.ui;
  const carousel = uiConfig?.carousel;
  const slides = carousel?.slides;

  return ClientAppConfigSchema.parse({
    brandName: uiConfig?.brandName || process.env.NEXT_PUBLIC_BRAND_NAME || 'Sealos',
    desktopDomain: getRuntimeDesktopDomain(config),
    currencySymbolType: getRuntimeCurrencySymbol(
      uiConfig?.currencySymbol || uiConfig?.currencySymbolType || process.env.CURRENCY_SYMBOL
    ),
    categories: templateConfig?.categories
      ? getRuntimeCategories(templateConfig.categories)
      : parseTemplateCategories(process.env.TEMPLATE_CATEGORIES),
    showAuthor: templateConfig?.features?.showAuthor ?? process.env.SHOW_AUTHOR === 'true',
    carousel: {
      enabled: carousel?.enabled === true,
      slides: Array.isArray(slides) ? slides : []
    }
  });
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  jsonRes(res, {
    code: 200,
    data: getClientAppConfigServer()
  });
}
