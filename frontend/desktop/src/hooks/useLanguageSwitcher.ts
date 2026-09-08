import { setCookie } from '@/utils/cookieUtils';
import { LOCALE_COOKIE_NAME, localeCookieOptions } from '@/utils/locale';
import { useTranslation } from 'next-i18next';
import { EVENT_NAME } from 'sealos-desktop-sdk';
import { masterApp } from 'sealos-desktop-sdk/master';

export function useLanguageSwitcher() {
  const { i18n } = useTranslation();

  const switchLanguage = (targetLang: string) => {
    masterApp?.sendMessageToAll({
      apiName: 'event-bus',
      eventName: EVENT_NAME.CHANGE_I18N,
      data: {
        currentLanguage: targetLang
      }
    });
    setCookie(LOCALE_COOKIE_NAME, targetLang, localeCookieOptions);
    i18n?.changeLanguage(targetLang);
  };

  return {
    currentLanguage: i18n?.language || 'en',
    switchLanguage,
    toggleLanguage: () => switchLanguage(i18n?.language === 'en' ? 'zh' : 'en')
  };
}
