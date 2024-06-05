import useAppStore from '@/stores/app';
import { useConfigStore } from '@/stores/config';
import { TApp } from '@/types';
import { Box, Button, Flex, Grid, HStack, Image, Text, useBreakpointValue } from '@chakra-ui/react';
import { throttle } from 'lodash';
import { useTranslation } from 'next-i18next';
import { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from '../icons';
import { blurBackgroundStyles } from './index';

export default function Apps() {
  const { t, i18n } = useTranslation();
  const { installedApps: apps, runningInfo, openApp, setToHighestLayerById } = useAppStore();
  const logo = useConfigStore().layoutConfig?.logo;
  const renderApps = apps.filter((item: TApp) => item?.displayType === 'normal');

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // grid value
  const gridMX = useBreakpointValue({ base: 32, lg: 48 }) || 32;
  const gridMT = 32;
  const gridSpacing = 36;
  const appWidth = 60;
  const appHeight = 86;
  const pageButton = 12;

  const handleDoubleClick = (e: MouseEvent<HTMLDivElement>, item: TApp) => {
    e.preventDefault();
    if (item?.name) {
      openApp(item);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calculateMaxAppsPerPage = useCallback(
    throttle(() => {
      const appsContainer = document.getElementById('apps-container');

      if (appsContainer) {
        const gridWidth = appsContainer.offsetWidth - gridMX * 2 - pageButton * 2;
        const gridHeight = appsContainer.offsetHeight - gridMT;

        const maxAppsInRow = Math.floor((gridWidth + gridSpacing) / (appWidth + gridSpacing));
        const maxAppsInColumn = Math.floor((gridHeight + gridSpacing) / (appHeight + gridSpacing));

        const maxApps = maxAppsInRow * maxAppsInColumn;

        setPage(1);
        setPageSize(maxApps);
      }
    }, 100),
    []
  );

  useEffect(() => {
    calculateMaxAppsPerPage();
    window.addEventListener('resize', calculateMaxAppsPerPage);
    return () => {
      window.removeEventListener('resize', calculateMaxAppsPerPage);
    };
  }, []);

  const paginatedApps = useMemo(
    () => renderApps.slice((page - 1) * pageSize, page * pageSize),
    [renderApps, page, pageSize]
  );

  const totalPages = Math.ceil(renderApps.length / pageSize);

  return (
    <Flex
      flexDirection={'column'}
      flex={1}
      {...blurBackgroundStyles}
      py={'32px'}
      px={{ base: '24px', xl: '36px' }}
      height={'calc(100% - 8px)'}
      zIndex={0} //  important!!!
    >
      <Box height={'20px'} color={'rgba(255, 255, 255, 0.90)'} fontSize={'md'} fontWeight={'bold'}>
        {t('All Apps')}
      </Box>
      <Flex width={'full'} height={'full'} id="apps-container" overflow={'auto'}>
        <Button
          minW={'12px'}
          flexGrow={0}
          alignSelf={'center'}
          variant={'unstyled'}
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page === 1}
          opacity={page === 1 ? '0.3' : '0.7'}
        >
          <ArrowLeftIcon />
        </Button>
        <Grid
          overflow={'hidden'}
          flex={1}
          mt={`${gridMT}px`}
          mx={`${gridMX}px`}
          gap={`${gridSpacing}px`}
          templateColumns={`repeat(auto-fill, minmax(${appWidth}px, 1fr))`}
          templateRows={`repeat(auto-fit, ${appHeight}px)`}
        >
          {paginatedApps &&
            paginatedApps.map((item: TApp, index) => (
              <Box
                w="60px"
                h="86px"
                key={index}
                userSelect="none"
                cursor={'pointer'}
                onClick={(e) => handleDoubleClick(e, item)}
              >
                <Box
                  className={item.key}
                  w="60px"
                  h="60px"
                  p={'8px'}
                  borderRadius={'8px'}
                  boxShadow={'0px 2px 6px 0px rgba(17, 24, 36, 0.15)'}
                  backgroundColor={'rgba(255, 255, 255, 0.90)'}
                  backdropFilter={'blur(50px)'}
                >
                  <Image
                    width="100%"
                    height="100%"
                    src={item?.icon}
                    fallbackSrc={logo || '/logo.svg'}
                    draggable={false}
                    alt="app logo"
                  />
                </Box>
                <Text
                  mt="10px"
                  color={'rgba(255, 255, 255, 0.90)'}
                  fontSize={'12px'}
                  fontWeight={'bold'}
                  textAlign={'center'}
                  textShadow={'0px 1px 2px rgba(17, 24, 36, 0.40)'}
                  lineHeight={'16px'}
                  noOfLines={1}
                >
                  {item?.i18n?.[i18n?.language]?.name
                    ? item?.i18n?.[i18n?.language]?.name
                    : t(item?.name)}
                </Text>
              </Box>
            ))}
        </Grid>
        <Button
          minW={'12px'}
          flexGrow={0}
          alignSelf={'center'}
          variant={'unstyled'}
          onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={page === totalPages}
          opacity={page === totalPages ? '0.3' : '0.7'}
        >
          <ArrowRightIcon />
        </Button>
      </Flex>
      <HStack justifyContent="center">
        {Array.from({ length: totalPages }, (_, index) => (
          <Box
            key={index}
            w="6px"
            h="6px"
            borderRadius="50%"
            bg={index + 1 === page ? 'rgba(255, 255, 255, 0.80)' : 'rgba(255, 255, 255, 0.30)'}
          />
        ))}
      </HStack>
    </Flex>
  );
}
