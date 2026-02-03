import Cookies, { CookieAttributes } from 'js-cookie';

export const setCookie = (key: string, value: string, options?: CookieAttributes) => {
  Cookies.set(key, value, options);
};

export const getCookie = (key: string) => {
  return Cookies.get(key);
};

export const removeCookie = (key: string) => {
  Cookies.remove(key);
};

// Shared Cookie configuration
const SHARED_AUTH_COOKIE_NAME = 'sealos_auth_token';
const COOKIE_EXPIRY_DAYS = 7;

// Get shared cookie domain (e.g., usw.sealos.io -> .sealos.io)
export const getSharedCookieDomain = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return undefined;
  const parts = hostname.split('.');
  if (parts.length >= 2) return '.' + parts.slice(-2).join('.');
  return undefined;
};

// Set shared authentication cookie
export const setSharedAuthCookie = (globalToken: string): void => {
  const domain = getSharedCookieDomain();
  const isHttps = window.location.protocol === 'https:';

  const options: CookieAttributes = {
    expires: COOKIE_EXPIRY_DAYS,
    path: '/',
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps
  };

  if (domain) options.domain = domain;
  Cookies.set(SHARED_AUTH_COOKIE_NAME, globalToken, options);
};

// Clear shared authentication cookie
export const clearSharedAuthCookie = (): void => {
  const domain = getSharedCookieDomain();
  const options: CookieAttributes = { path: '/' };
  if (domain) options.domain = domain;
  Cookies.remove(SHARED_AUTH_COOKIE_NAME, options);
  Cookies.remove(SHARED_AUTH_COOKIE_NAME, { path: '/' }); // Compatible with local development
};

export { SHARED_AUTH_COOKIE_NAME };
