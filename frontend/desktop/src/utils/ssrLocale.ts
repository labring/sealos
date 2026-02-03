import type { IncomingMessage, ServerResponse } from 'http';
import { compareFirstLanguages } from '@/utils/tools';

export const LANG_COOKIE_KEY = 'NEXT_LOCALE';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function normalizeLocale(locale: string): 'en' | 'zh' {
  // Keep desktop locales consistent with next-i18next config: ['en', 'zh']
  return locale?.startsWith('zh') ? 'zh' : 'en';
}

/**
 * Ensure `NEXT_LOCALE` cookie exists during SSR.
 * - If cookie already exists, it will be refreshed (Max-Age extended)
 * - If missing, it is derived from `Accept-Language`
 */
export function ensureLocaleCookie({
  req,
  res,
  defaultLocale = 'en'
}: {
  req: IncomingMessage & { cookies?: Record<string, string> };
  res: ServerResponse;
  defaultLocale?: 'en' | 'zh';
}): 'en' | 'zh' {
  const cookieLocale = req?.cookies?.[LANG_COOKIE_KEY];

  const acceptLanguage = req?.headers?.['accept-language'];
  const acceptLanguageStr = typeof acceptLanguage === 'string' ? acceptLanguage : defaultLocale;

  const derived = cookieLocale || compareFirstLanguages(acceptLanguageStr);
  const locale = normalizeLocale(derived);

  res.setHeader(
    'Set-Cookie',
    `${LANG_COOKIE_KEY}=${locale}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Secure; SameSite=None`
  );

  return locale;
}
