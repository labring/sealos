import { setCookie } from '@/utils/cookieUtils';
import {
  Button,
  Flex,
  FlexProps,
  Menu,
  MenuButton,
  MenuButtonProps,
  MenuItem,
  MenuList,
  Text
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { EVENT_NAME } from 'sealos-desktop-sdk';
import { masterApp } from 'sealos-desktop-sdk/master';
import { ExpanMoreIcon } from '../../../../packages/ui';
import { ROLE_LIST } from '@/types/team';
import { router } from 'next/client';

export default function LangSelectList(props: MenuButtonProps) {
  const { t, i18n } = useTranslation();
  const langkv = {
    en: 'English',
    zh: '中文'
  } as const;
  const langList = [
    ['en', 'English'],
    ['zh', '中文']
  ] as const;
  return (
    <Menu>
      <MenuButton
        as={Button}
        variant={'unstyled'}
        borderRadius="2px"
        border="1px solid #DEE0E2"
        bgColor="#FBFBFC"
        w="100%"
        h={'32px'}
        fontWeight={400}
        display={'flex'}
        justifyContent={'space-between'}
        rightIcon={<ExpanMoreIcon boxSize={'16px'} />}
        {...props}
      >
        <Text>{langkv[i18n.language as 'en' | 'zh']}</Text>
      </MenuButton>
      <MenuList borderRadius={'2px'}>
        {langList.map(([lngKey, lngVal], idx) => (
          <MenuItem
            w="330px"
            onClick={(e) => {
              e.preventDefault();
              masterApp?.sendMessageToAll({
                apiName: 'event-bus',
                eventName: EVENT_NAME.CHANGE_I18N,
                data: {
                  currentLanguage: lngKey
                }
              });
              setCookie('NEXT_LOCALE', lngKey, {
                expires: 30,
                sameSite: 'None',
                secure: true
              });
              i18n?.changeLanguage(lngKey);
            }}
            key={lngKey}
          >
            {lngVal}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
}
