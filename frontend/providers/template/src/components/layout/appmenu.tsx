import { useCachedStore } from '@/store/cached';
import { useSearchStore } from '@/store/search';
import { getLangStore, setLangStore } from '@/utils/cookieUtils';
import { Center, Flex, Icon, Input, InputGroup, InputLeftElement, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import SideBar from './sidebar';
import { ApplicationType } from '@/types/app';

export default function AppMenu() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { setSearchValue, setAppType } = useSearchStore();
  const { insideCloud } = useCachedStore();

  const changeI18n = () => {
    const lastLang = getLangStore();
    const newLang = lastLang === 'en' ? 'zh' : 'en';
    if (i18n?.changeLanguage) {
      i18n.changeLanguage(newLang);
      setLangStore(newLang);
    }
  };

  return (
    <Flex flexDirection={'column'} px="16px" position={'relative'}>
      <InputGroup mt="16px" background={'rgba(150, 153, 180, 0.10)'} borderRadius={'4px'}>
        <InputLeftElement pointerEvents="none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="17"
            viewBox="0 0 16 17"
            fill="none"
          >
            <path
              d="M14.4733 14.2786L12 11.8252C12.9601 10.6282 13.425 9.10876 13.2992 7.57942C13.1734 6.05009 12.4664 4.62708 11.3237 3.60299C10.1809 2.57889 8.6892 2.03156 7.15528 2.07354C5.62136 2.11551 4.16181 2.7436 3.07676 3.82865C1.99171 4.9137 1.36362 6.37325 1.32164 7.90717C1.27967 9.44109 1.827 10.9328 2.85109 12.0756C3.87519 13.2183 5.2982 13.9253 6.82753 14.0511C8.35686 14.1769 9.87627 13.712 11.0733 12.7519L13.5267 15.2052C13.5886 15.2677 13.6624 15.3173 13.7436 15.3512C13.8249 15.385 13.912 15.4024 14 15.4024C14.088 15.4024 14.1751 15.385 14.2564 15.3512C14.3376 15.3173 14.4114 15.2677 14.4733 15.2052C14.5935 15.0809 14.6607 14.9148 14.6607 14.7419C14.6607 14.569 14.5935 14.4029 14.4733 14.2786ZM7.33333 12.7519C6.41035 12.7519 5.5081 12.4782 4.74067 11.9654C3.97324 11.4526 3.3751 10.7238 3.02189 9.87108C2.66868 9.01836 2.57627 8.08005 2.75633 7.1748C2.9364 6.26956 3.38085 5.43804 4.0335 4.78539C4.68614 4.13275 5.51766 3.68829 6.42291 3.50822C7.32815 3.32816 8.26646 3.42058 9.11919 3.77378C9.97191 4.12699 10.7007 4.72513 11.2135 5.49256C11.7263 6.25999 12 7.16224 12 8.08522C12 9.3229 11.5083 10.5099 10.6332 11.3851C9.75799 12.2602 8.57101 12.7519 7.33333 12.7519Z"
              fill="#5A646E"
            />
          </svg>
        </InputLeftElement>
        <Input
          border={'1px solid transparent'}
          borderRadius={'4px'}
          placeholder={t('Application Name') || 'Application Name'}
          onChange={(e) => {
            setSearchValue(e.target.value);
          }}
          _focus={{
            boxShadow: 'none',
            border: '1.5px solid #219BF4',
            background: '#FFF'
          }}
        />
      </InputGroup>

      <SideBar />

      <Flex
        cursor={'default'}
        p="8px 4px"
        mb="8px"
        h="48px"
        borderRadius={'4px'}
        background={router.route === '/app' ? 'rgba(150, 153, 180, 0.15)' : ''}
        _hover={{
          background: 'rgba(150, 153, 180, 0.10)'
        }}
        alignItems={'center'}
        onClick={() => {
          router.replace('/app');
          setAppType(ApplicationType.MyApp);
        }}
      >
        <Icon
          xmlns="http://www.w3.org/2000/svg"
          width="32px"
          height="32px"
          viewBox="0 0 32 32"
          fill="none"
        >
          <path
            d="M32 16C32 24.8366 24.8366 32 16 32C7.16344 32 0 24.8366 0 16C0 7.16344 7.16344 0 16 0C24.8366 0 32 7.16344 32 16Z"
            fill="#9699B4"
            fillOpacity="0.8"
          />
          <path
            d="M16 16C17.934 16 19.5 14.434 19.5 12.5C19.5 10.566 17.934 9 16 9C15.5403 8.99987 15.0851 9.09031 14.6605 9.26615C14.2358 9.442 13.8499 9.6998 13.5248 10.0248C13.1998 10.3499 12.942 10.7358 12.7662 11.1605C12.5903 11.5852 12.4999 12.0403 12.5 12.5C12.5 14.434 14.066 16 16 16ZM16 17C13.664 17 9 18.34 9 21V23H23V21C23 18.34 18.336 17 16 17Z"
            fill="#F0F0F5"
          />
        </Icon>
        <Text ml="10px" fontSize={'14px'} fontWeight={500}>
          {t('SideBar.My App')}
        </Text>

        {!insideCloud && (
          <Center
            ml="auto"
            bg="rgba(150, 153, 180, 0.15)"
            color={'#485058'}
            w="28px"
            h="28px"
            borderRadius={'50%'}
            bottom={'28px'}
            right={'16px'}
            fontSize={'12px'}
            fontWeight={500}
            cursor={'pointer'}
            onClick={(e) => {
              e.stopPropagation();
              changeI18n();
            }}
          >
            {i18n?.language === 'en' ? 'En' : '中'}
          </Center>
        )}
      </Flex>
    </Flex>
  );
}
