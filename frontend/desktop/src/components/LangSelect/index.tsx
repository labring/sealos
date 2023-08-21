import { setCookie } from '@/utils/cookieUtils';
import { Box, Button, Stack, UseDisclosureReturn } from '@chakra-ui/react';
import { I18n } from 'next-i18next';
import { EVENT_NAME } from 'sealos-desktop-sdk';
import { masterApp } from 'sealos-desktop-sdk/master';

const LANG_LIST = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' }
];
function LangSelect({ disclosure, i18n }: { disclosure: UseDisclosureReturn; i18n: I18n | null }) {
  // const { i18n, ready } = useTranslation();

  return disclosure.isOpen ? (
    <>
      <Box position={'fixed'} inset={0} zIndex={'998'} onClick={disclosure.onClose}></Box>
      <Stack
        p={'6px'}
        boxSizing="border-box"
        minW={'94px'}
        shadow={'0px 0px 1px 0px #798D9F40, 0px 2px 4px 0px #A1A7B340'}
        position={'absolute'}
        top="48px"
        right={0}
        bg="rgba(255, 255, 255, 0.6)"
        boxShadow={'0px 1px 2px rgba(0, 0, 0, 0.2)'}
        zIndex={'999'}
        borderRadius={'4px'}
      >
        {LANG_LIST.map((item, index) => (
          <Button
            fontStyle="normal"
            fontWeight="400"
            fontSize="12px"
            variant={'unstyled'}
            key={item.label}
            pl={'4px'}
            py={'6px'}
            display={'flex'}
            justifyContent={'flex-start'}
            {...(item.value === i18n?.language
              ? {
                  bg: 'rgba(0, 0, 0, 0.05)',
                  color: '#0884DD'
                }
              : {})}
            w="full"
            onClick={() => {
              masterApp?.sendMessageToAll({
                apiName: 'event-bus',
                eventName: EVENT_NAME.CHANGE_I18N,
                data: {
                  currentLanguage: item.value
                }
              });
              setCookie('NEXT_LOCALE', item.value, { expires: 30, sameSite: 'None', secure: true });
              i18n?.changeLanguage(item.value);
            }}
          >
            {item.label}
          </Button>
        ))}
      </Stack>
    </>
  ) : (
    <></>
  );
}

export default LangSelect;
