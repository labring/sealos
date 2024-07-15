import { Box, Flex, Grid, GridItem, Text, Image } from '@chakra-ui/react';
import { useContext, MouseEvent, useState } from 'react';
import { MoreAppsContext } from '@/pages/index';
import useAppStore from '@/stores/app';
import { TApp } from '@/types';
import Iconfont from '../iconfont';
import styles from './index.module.scss';
import clsx from 'clsx';
import { useTranslation } from 'next-i18next';
import { useConfigStore } from '@/stores/config';

export default function Index() {
  const { t, i18n } = useTranslation();
  const moreAppsContent = useContext(MoreAppsContext);
  const { installedApps: apps, openApp } = useAppStore();
  const itemsPerPage = 30; // Number of apps per page
  const [currentPage, setCurrentPage] = useState(1);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedApps = apps?.slice(startIndex, endIndex);
  const totalPages = Math.ceil((apps?.length || 0) / itemsPerPage);
  const logo = useConfigStore().layoutConfig?.logo;

  const handleDoubleClick = (e: MouseEvent<HTMLDivElement>, item: TApp) => {
    e.preventDefault();
    if (item?.name) {
      openApp(item);
    }
  };

  return (
    <Box
      data-show={moreAppsContent?.showMoreApps}
      className={clsx(styles.container)}
      onClick={() => {
        moreAppsContent?.setShowMoreApps(false);
      }}
    >
      <Flex justifyContent={'center'}>
        <Text
          fontWeight={500}
          fontSize={'24px'}
          color={'#FFFFFF'}
          textShadow={'0px 1px 2px rgba(0, 0, 0, 0.4)'}
          lineHeight={'140%'}
        >
          {t('common:more_apps')}
        </Text>
      </Flex>
      <Flex alignItems={'center'}>
        <Flex
          alignItems={'center'}
          justifyContent={'center'}
          w="60px"
          h="60px"
          borderRadius={'50%'}
          cursor={'pointer'}
          _hover={{
            background: 'rgba(255, 255, 255, 0.3)'
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (currentPage <= 1) return;
            setCurrentPage((state) => state - 1);
          }}
        >
          <Iconfont
            iconName="icon-more-right"
            width={24}
            height={24}
            color={currentPage === 1 ? '#9cc2d1' : '#FFFFFF'}
          ></Iconfont>
        </Flex>
        <Grid
          className={styles.appsContainer}
          mt="68px"
          maxW={'868px'}
          mx="auto"
          templateRows={'repeat(2, 100px)'}
          templateColumns={'repeat(5, 72px)'}
        >
          {paginatedApps &&
            paginatedApps.map((item: TApp, index: number) => (
              <GridItem
                w="72px"
                h="100px"
                key={index}
                userSelect="none"
                cursor={'pointer'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDoubleClick(e, item);
                }}
              >
                <Box
                  w="72px"
                  h="72px"
                  p={'15px'}
                  border={'1px solid #FFFFFF'}
                  borderRadius={8}
                  boxShadow={'0px 1.16667px 2.33333px rgba(0, 0, 0, 0.2)'}
                  backgroundColor={'rgba(244, 246, 248, 0.9)'}
                >
                  <Image
                    width="100%"
                    height="100%"
                    src={item?.icon}
                    fallbackSrc={logo || '/logo.svg'}
                    draggable={false}
                    alt="user avator"
                  />
                </Box>
                <Text
                  textShadow={'0px 1px 2px rgba(0, 0, 0, 0.4)'}
                  textAlign={'center'}
                  mt="8px"
                  color={'#FFFFFF'}
                  fontSize={'10px'}
                  lineHeight={'16px'}
                >
                  {item?.i18n?.[i18n?.language]?.name
                    ? item?.i18n?.[i18n?.language]?.name
                    : item?.name}
                </Text>
              </GridItem>
            ))}
        </Grid>
        <Flex
          alignItems={'center'}
          justifyContent={'center'}
          w="60px"
          h="60px"
          borderRadius={'50%'}
          _hover={{
            background: 'rgba(255, 255, 255, 0.3)'
          }}
          cursor={'pointer'}
          onClick={(e) => {
            e.stopPropagation();
            if (currentPage >= totalPages) return;
            setCurrentPage((state) => state + 1);
          }}
        >
          <Iconfont
            iconName="icon-more-left"
            width={24}
            height={24}
            color={currentPage === totalPages ? '#9cc2d1' : '#FFFFFF'}
          ></Iconfont>
        </Flex>
      </Flex>
      <Flex
        justifyContent={'center'}
        position={'absolute'}
        bottom={'48px'}
        left={'50%'}
        transform={' translateX(-50%)'}
      >
        <Text color={'#FFFFFF'}>{currentPage}</Text>
        <Text color={'#b8d5e1'}>&nbsp;/&nbsp;{totalPages}</Text>
      </Flex>
    </Box>
  );
}
