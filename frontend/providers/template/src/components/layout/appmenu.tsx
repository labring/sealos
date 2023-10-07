import { Box, Flex, Input, InputGroup, InputLeftElement, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import SideBar from './sidebar';
import { useRouter } from 'next/router';
import MyIcon from '../Icon';
import { useGlobalStore } from '@/store/global';
import { useMemo } from 'react';
import { useSearchStore } from '@/store/search';

export default function AppMenu({ isMobile }: { isMobile: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { searchValue, setSearchValue } = useSearchStore();

  return (
    <Box py="28px" px="16px" position={'relative'}>
      {!isMobile && (
        <>
          <Text color={'#24282C'} fontWeight={500} fontSize={'24px'}>
            {t('Templates')}
          </Text>
          <InputGroup mt="24px" background={'rgba(150, 153, 180, 0.10)'}>
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
              placeholder={t('Template Name') || 'Template Name'}
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
        </>
      )}

      <SideBar isMobile={isMobile} />

      <Flex
        justifyContent={'center'}
        alignItems={'center'}
        p="4px 12px"
        position={'absolute'}
        backgroundColor={'rgba(150, 153, 180, 0.15)'}
        borderRadius={'40px'}
        bottom={'28px'}
        userSelect={'none'}
        onClick={() => router.push('/develop')}
      >
        <MyIcon name="tool" fill={'transparent'} />
        {!isMobile && (
          <Text ml="8px" color={'#485058'} fontWeight={500} cursor={'pointer'} fontSize={'12px'}>
            {t('develop.YAML Detection Tool')}
          </Text>
        )}
      </Flex>
    </Box>
  );
}
