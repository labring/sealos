/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';
import { useLanguageSwitcher } from '@/hooks/useLanguageSwitcher';
import { setCookie } from '@/utils/cookieUtils';
import { LOCALE_COOKIE_NAME, localeCookieOptions } from '@/utils/locale';
import { masterApp } from 'sealos-desktop-sdk/master';

const mockChangeLanguage = jest.fn();

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      language: 'zh',
      changeLanguage: mockChangeLanguage
    }
  })
}));

jest.mock('@/utils/cookieUtils', () => ({
  setCookie: jest.fn()
}));

jest.mock('sealos-desktop-sdk', () => ({
  EVENT_NAME: { CHANGE_I18N: 'change_i18n' }
}));

jest.mock('sealos-desktop-sdk/master', () => ({
  masterApp: { sendMessageToAll: jest.fn() }
}));

describe('useLanguageSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists a user-selected language before navigation', () => {
    const { result } = renderHook(() => useLanguageSwitcher());

    result.current.switchLanguage('en');

    expect(setCookie).toHaveBeenCalledWith(LOCALE_COOKIE_NAME, 'en', localeCookieOptions);
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
    expect(masterApp?.sendMessageToAll).toHaveBeenCalledWith({
      apiName: 'event-bus',
      eventName: 'change_i18n',
      data: { currentLanguage: 'en' }
    });
  });
});
