import {
  getLocaleCookieHeader,
  getPlatformDefaultLocale,
  getRequestLocale,
  localeCookieOptions,
  normalizeLocale
} from '@/utils/locale';

describe('locale persistence', () => {
  it('keeps the user-selected language over the platform default after a reload', () => {
    expect(getRequestLocale('en', 'zh')).toBe('en');
    expect(getRequestLocale('zh', 'en')).toBe('zh');
  });

  it('uses the platform version only when no valid user preference exists', () => {
    expect(normalizeLocale('zh-Hans')).toBe('zh');
    expect(normalizeLocale('en-US')).toBe('en');
    expect(getPlatformDefaultLocale('cn')).toBe('zh');
    expect(getPlatformDefaultLocale('en')).toBe('en');
    expect(getRequestLocale('fr', getPlatformDefaultLocale('cn'))).toBe('zh');
    expect(getRequestLocale(undefined, getPlatformDefaultLocale('en'))).toBe('en');
  });

  it('uses one root-scoped cookie contract for client and server navigation', () => {
    expect(localeCookieOptions).toMatchObject({
      expires: 30,
      path: '/',
      sameSite: 'None',
      secure: true
    });
    expect(getLocaleCookieHeader('en')).toBe(
      'NEXT_LOCALE=en; Path=/; Max-Age=2592000; Secure; SameSite=None'
    );
  });
});
