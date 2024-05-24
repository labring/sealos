import { MoreAppsContext } from '@/pages/index';
import useAppStore, { AppInfo } from '@/stores/app';
import { useConfigStore } from '@/stores/config';
import { APPTYPE } from '@/types';
import { Box, BoxProps, Flex, useDisclosure, Image, Img, Center } from '@chakra-ui/react';
import { MouseEvent, useContext, useMemo, useState } from 'react';

// const DockStyles: BoxProps = {};

export default function AppDock() {
  const {
    installedApps: apps,
    runningInfo,
    setToHighestLayerById,
    currentAppPid,
    switchAppById,
    updateOpenedAppInfo
  } = useAppStore();
  const logo = useConfigStore().layoutConfig?.logo;
  const moreAppsContent = useContext(MoreAppsContext);

  const AppMenuLists: AppInfo[] = [
    {
      name: 'home',
      icon: '/icons/home.svg',
      zIndex: 99999,
      isShow: true,
      pid: -9,
      size: 'maxmin',
      cacheSize: 'maxmin',
      style: {},
      mouseDowning: false,
      key: `system-sealos-home`,
      type: APPTYPE.IFRAME,
      data: {
        url: '',
        desc: ''
      },
      displayType: 'hidden'
    },
    // {
    //   name: 'apps',
    //   icon: '/icons/apps.svg',
    //   zIndex: 99999,
    //   isShow: true,
    //   pid: -10,
    //   size: 'maxmin',
    //   cacheSize: 'maxmin',
    //   style: {},
    //   mouseDowning: false,
    //   key: `system-sealos-apps`,
    //   type: APPTYPE.IFRAME,
    //   data: {
    //     url: '',
    //     desc: ''
    //   },
    //   displayType: 'hidden'
    // },
    ...runningInfo
  ];

  console.log(AppMenuLists);

  // Handle icon click event
  const handleNavItem = (e: MouseEvent<HTMLDivElement>, item: AppInfo) => {
    if (item.key === 'system-sealos-home') {
      const isNotMinimized = runningInfo.some((item) => item.size !== 'minimize');
      runningInfo.forEach((item) => {
        updateOpenedAppInfo({
          ...item,
          size: isNotMinimized ? 'minimize' : item.cacheSize
        });
      });
      return;
    }

    if (item.key === 'system-sealos-apps') {
      moreAppsContent?.setShowMoreApps(true);
      return;
    }

    if (item.pid === currentAppPid && item.size !== 'minimize') {
      updateOpenedAppInfo({
        ...item,
        size: 'minimize',
        cacheSize: item.size
      });
    } else {
      switchAppById(item.pid);
    }
  };

  return (
    <Flex
      bg="rgba(220, 220, 224, 0.3)"
      backdropFilter="blur(80px) saturate(150%)"
      borderRadius="12px"
      border="1px solid rgba(255, 255, 255, 0.07)"
      boxShadow={
        '0px 0px 20px -4px rgba(12, 26, 67, 0.25), 0px 0px 1px 0px rgba(24, 43, 100, 0.25)'
      }
      zIndex={'9999'}
      minW={'326px'}
      maxW={'560px'}
      w={'auto'}
      gap={'12px'}
      position="absolute"
      left="50%"
      bottom={'4px'}
      transform="translateX(-50%)"
      userSelect={'none'}
      px={'12px'}
      pt={'6px'}
      pb={'2px'}
    >
      {AppMenuLists.map((item: AppInfo, index: number) => {
        return (
          <Flex
            flexDirection={'column'}
            alignItems={'center'}
            cursor={'pointer'}
            key={item?.name}
            onClick={(e) => handleNavItem(e, item)}
          >
            <Center
              w="40px"
              h="40px"
              borderRadius={'8px'}
              bg={'rgba(255, 255, 255, 0.85)'}
              backdropFilter={'blur(25px)'}
              boxShadow={'0px 1.167px 2.333px 0px rgba(0, 0, 0, 0.20)'}
            >
              <Image
                src={item?.icon}
                fallbackSrc={logo || '/logo.svg'}
                alt={item?.name}
                w="32px"
                h="32px"
              />
            </Center>
            <Box
              opacity={currentAppPid === item.pid ? 1 : 0}
              mt={'6px'}
              width={'4px'}
              height={'4px'}
              borderRadius={'full'}
              bg={'rgba(7, 27, 65, 0.50)'}
            ></Box>
          </Flex>
        );
      })}
    </Flex>
  );
}
