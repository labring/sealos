import useAppStore from '@/stores/app';
import { useConfigStore } from '@/stores/config';
import { TApp } from '@/types';
import { Box, Center, Flex, Image, Input } from '@chakra-ui/react';
import { SearchIcon } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import { useRef, useState } from 'react';
import { blurBackgroundStyles } from './index';

export default function SearchBox() {
  const { t, i18n } = useTranslation();
  const logo = useConfigStore().layoutConfig?.logo;
  const { installedApps: apps, runningInfo, openApp, setToHighestLayerById } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const getAppNames = (app: TApp) => {
    const names = [app.name];
    if (app.i18n) {
      Object.values(app.i18n).forEach((i18nData) => {
        if (i18nData.name) {
          names.push(i18nData.name);
        }
      });
    }
    return names;
  };

  // Filter apps based on search term
  const filteredApps = apps.filter((app) => {
    const appNames = getAppNames(app);
    return appNames.some((name) => name.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  return (
    <Box
      flex={1}
      onClick={() => {
        inputRef.current?.focus();
      }}
      cursor={'pointer'}
      position={'relative'}
    >
      <Flex
        height={'full'}
        alignItems={'center'}
        color={'white'}
        bg={'rgba(22, 30, 40, 0.35)'}
        backdropFilter={'blur(80px) saturate(180%)'}
        border={'none'}
        borderRadius={'12px'}
      >
        <SearchIcon ml={'16px'} width={'16px'} height={'16px'} />
        <Input
          pl={'6px'}
          mr={'16px'}
          ref={inputRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          w={'full'}
          outline={'none'}
          type="text"
          placeholder={t('common:search_apps') || 'Search Apps'}
          bg={'transparent'}
          outlineOffset={''}
          border={'none'}
          _placeholder={{ color: 'white' }}
          boxShadow={'none'}
          _hover={{
            bg: 'transparent'
          }}
          _focus={{
            bg: 'transparent',
            color: 'white',
            border: 'none',
            boxShadow: 'none'
          }}
        />
      </Flex>
      {searchTerm !== '' && (
        <Flex
          flexDirection={'column'}
          position={'absolute'}
          top={'100%'}
          width={'100%'}
          mt={2}
          p={'16px'}
          color={'rgba(255, 255, 255, 0.90)'}
          {...blurBackgroundStyles}
        >
          {filteredApps.length > 0 ? (
            filteredApps.map((app) => (
              <Flex
                key={app.key}
                p={'7px 13px'}
                cursor="pointer"
                _hover={{ bg: 'rgba(255, 255, 255, 0.07)' }}
                alignItems={'center'}
                borderRadius={'md'}
                onClick={() => {
                  openApp(app);
                  setSearchTerm('');
                }}
                display={'flex'}
                gap={'10px'}
                fontSize={'12px'}
                fontWeight={500}
                color={'rgba(255, 255, 255, 0.90)'}
              >
                <Center
                  w="28px"
                  h="28px"
                  borderRadius={'md'}
                  boxShadow={'0px 2px 6px 0px rgba(17, 24, 36, 0.15)'}
                  backgroundColor={'rgba(255, 255, 255, 0.90)'}
                  backdropFilter={'blur(50px)'}
                >
                  <Image
                    width="20px"
                    height="20px"
                    src={app?.icon}
                    fallbackSrc={logo || '/logo.svg'}
                    draggable={false}
                    alt="app logo"
                  />
                </Center>

                {app?.i18n?.[i18n?.language]?.name ? app?.i18n?.[i18n?.language]?.name : app?.name}
              </Flex>
            ))
          ) : (
            <Flex
              p={'7px 13px'}
              fontSize={'12px'}
              fontWeight={500}
              color={'rgba(255, 255, 255, 0.90)'}
            >
              {t('common:no_apps_found') || 'No Apps Found'}
            </Flex>
          )}
        </Flex>
      )}
    </Box>
  );
}
