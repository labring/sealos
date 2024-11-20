import { useConfigStore } from '@/stores/config';
import { setCookie } from '@/utils/cookieUtils';
import { Flex, FlexProps } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useEffect } from 'react';
import { EVENT_NAME } from 'sealos-desktop-sdk';
import { masterApp } from 'sealos-desktop-sdk/master';

export default function LangSelectSimple(props: FlexProps) {
  const { t, i18n } = useTranslation();
  const { layoutConfig } = useConfigStore();

  useEffect(() => {
    if (layoutConfig?.forcedLanguage && i18n?.language !== layoutConfig.forcedLanguage) {
      masterApp?.sendMessageToAll({
        apiName: 'event-bus',
        eventName: EVENT_NAME.CHANGE_I18N,
        data: {
          currentLanguage: layoutConfig.forcedLanguage
        }
      });
      setCookie('NEXT_LOCALE', layoutConfig.forcedLanguage, {
        expires: 30,
        sameSite: 'None',
        secure: true
      });
      i18n?.changeLanguage(layoutConfig.forcedLanguage);
    }
  }, [layoutConfig?.forcedLanguage, i18n]);

  return (
    <Flex
      userSelect={'none'}
      w="32px"
      h="32px"
      borderRadius={'50%'}
      justifyContent={'center'}
      alignItems={'center'}
      backgroundColor={'#FFF'}
      color={'#152539'}
      cursor={'pointer'}
      fontWeight={500}
      {...props}
      onClick={
        layoutConfig?.forcedLanguage
          ? undefined
          : () => {
              masterApp?.sendMessageToAll({
                apiName: 'event-bus',
                eventName: EVENT_NAME.CHANGE_I18N,
                data: {
                  currentLanguage: i18n?.language === 'en' ? 'zh' : 'en'
                }
              });
              setCookie('NEXT_LOCALE', i18n?.language === 'en' ? 'zh' : 'en', {
                expires: 30,
                sameSite: 'None',
                secure: true
              });
              i18n?.changeLanguage(i18n?.language === 'en' ? 'zh' : 'en');
            }
      }
    >
      {i18n?.language === 'en' ? 'En' : '中'}
    </Flex>
  );
}
