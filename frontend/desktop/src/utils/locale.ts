import type { CookieAttributes } from 'js-cookie';

export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
export type SupportedLocale = 'zh' | 'en';

export const localeCookieOptions: CookieAttributes = {
  expires: 30,
  path: '/',
  sameSite: 'None',
  secure: true
};

export function normalizeLocale(locale?: string) {
  if (locale?.toLowerCase().startsWith('zh')) return 'zh';
  if (locale?.toLowerCase().startsWith('en')) return 'en';
  return undefined;
}

export function getPlatformDefaultLocale(version?: string): SupportedLocale {
  return version === 'cn' ? 'zh' : 'en';
}

export function getRequestLocale(localeCookie: string | undefined, defaultLocale: SupportedLocale) {
  return normalizeLocale(localeCookie) || defaultLocale;
}

export function getLocaleCookieHeader(locale: string) {
  return `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; Secure; SameSite=None`;
}
