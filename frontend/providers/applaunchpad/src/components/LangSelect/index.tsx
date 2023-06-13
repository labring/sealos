import { setLangStore } from '@/utils/cookieUtils';
import { Menu, MenuButton, MenuButtonProps, MenuItem, MenuList, Text } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

const langIcon = (
  <svg
    viewBox="0 0 24 24"
    focusable="false"
    width="1em"
    height="1em"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M0 0h24v24H0z" fill="none" />
    <path
      d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z "
      className="css-c4d79v"
    />
  </svg>
);

const LANG_MAP = {
  en: {
    label: 'English'
  },
  zh: {
    label: '中文'
  }
} as const;

const LangSelect: React.FC<MenuButtonProps> = (props) => {
  const { i18n } = useTranslation();

  return (
    <Menu autoSelect={false}>
      <MenuButton p="4px" {...props}>
        {langIcon}
      </MenuButton>
      <MenuList w="max-content" minW="120px">
        {Object.entries(LANG_MAP).map(([key, lang]) => (
          <MenuItem
            key={key}
            display="flex"
            alignItems="center"
            fontSize="sm"
            {...(key === i18n.language ? { bg: 'A7Gray.200' } : {})}
            onClick={() => {
              setLangStore(key);
              i18n.changeLanguage(key);
            }}
          >
            <Text>{lang.label}</Text>
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
};

export default LangSelect;
