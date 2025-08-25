import { useConfigStore } from '@/stores/config';
import { setCookie } from '@/utils/cookieUtils';
import { useTranslation } from 'next-i18next';
import { useEffect } from 'react';
import { EVENT_NAME } from 'sealos-desktop-sdk';
import { masterApp } from 'sealos-desktop-sdk/master';

export function useLanguageSwitcher() {
  const { i18n } = useTranslation();
  const { layoutConfig } = useConfigStore();

  const switchLanguage = (targetLang: string) => {
    masterApp?.sendMessageToAll({
      apiName: 'event-bus',
      eventName: EVENT_NAME.CHANGE_I18N,
      data: {
        currentLanguage: targetLang
      }
    });
    setCookie('NEXT_LOCALE', targetLang, {
      expires: 30,
      sameSite: 'None',
      secure: true
    });
    i18n?.changeLanguage(targetLang);
  };

  useEffect(() => {
    if (layoutConfig?.forcedLanguage && i18n?.language !== layoutConfig.forcedLanguage) {
      switchLanguage(layoutConfig.forcedLanguage);
    }
  }, [layoutConfig?.forcedLanguage, i18n]);

  return {
    currentLanguage: i18n?.language || 'en',
    switchLanguage,
    toggleLanguage: () => switchLanguage(i18n?.language === 'en' ? 'zh' : 'en')
  };
}
