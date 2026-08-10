import { jsonRes } from '@/services/backend/response';
import {
  getRuntimeCategories,
  getRuntimeCurrencySymbol,
  getRuntimeDesktopDomain,
  readRuntimeAppConfig,
  type TemplateCategory
} from '@/utils/appConfig';
import type { NextApiRequest, NextApiResponse } from 'next';

type ClientAppConfig = {
  brandName: string;
  carousel: {
    enabled: boolean;
    slides: unknown[];
  };
  categories: TemplateCategory[];
  showAuthor: boolean;
  currencySymbol: 'shellCoin' | 'cny' | 'usd';
  desktopDomain: string;
};

export function getClientAppConfigServer(): ClientAppConfig {
  const config = readRuntimeAppConfig();
  const templateConfig = config.template;
  const uiConfig = templateConfig?.ui;
  const carousel = uiConfig?.carousel;
  const slides = carousel?.slides;
  const carouselSlides = Array.isArray(slides) ? slides : [];

  return {
    brandName: uiConfig?.brandName || process.env.NEXT_PUBLIC_BRAND_NAME || 'Sealos',
    carousel: {
      enabled: carousel?.enabled === true,
      slides: carouselSlides
    },
    categories: getRuntimeCategories(templateConfig?.categories),
    showAuthor: templateConfig?.features?.showAuthor ?? process.env.SHOW_AUTHOR === 'true',
    currencySymbol: getRuntimeCurrencySymbol(
      uiConfig?.currencySymbol || uiConfig?.currencySymbolType || process.env.CURRENCY_SYMBOL
    ),
    desktopDomain: getRuntimeDesktopDomain(config)
  };
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  jsonRes<ClientAppConfig>(res, {
    code: 200,
    data: getClientAppConfigServer()
  });
}
