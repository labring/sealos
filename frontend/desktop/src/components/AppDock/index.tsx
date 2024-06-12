import { MoreAppsContext } from '@/pages/index';
import useAppStore, { AppInfo } from '@/stores/app';
import { useConfigStore } from '@/stores/config';
import { APPTYPE, TApp } from '@/types';
import { Box, Center, Flex, Image, useDisclosure } from '@chakra-ui/react';
import { MouseEvent, useContext, useMemo, useState } from 'react';
import { ChevronDownIcon } from '../icons';

export default function AppDock() {
  const {
    installedApps: apps,
    runningInfo,
    setToHighestLayerById,
    currentAppPid,
    openApp,
    switchAppById,
    findAppInfoById,
    updateOpenedAppInfo
  } = useAppStore();
  const logo = useConfigStore().layoutConfig?.logo;
  const moreAppsContent = useContext(MoreAppsContext);
  const [isNavbarVisible, setNavbarVisible] = useState(true);

  const AppMenuLists = useMemo(() => {
    const initialApps: TApp[] = [
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
      ...apps.slice(0, 5).map((app, index) => ({ ...app, pid: -2 }))
    ];

    const mergedApps = initialApps.map((app) => {
      const runningApp = runningInfo.find((running) => running.key === app.key);
      return runningApp ? { ...app, ...runningApp } : app;
    });

    return [
      ...mergedApps,
      ...runningInfo.filter((running) => !initialApps.some((app) => app.key === running.key))
    ];
  }, [apps, runningInfo]);

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
      const app = findAppInfoById(item.pid);
      if (!app) {
        openApp(item);
      } else {
        switchAppById(item.pid);
      }
    }
  };

  return (
    <Box position="absolute" left="50%" bottom={'4px'} transform="translateX(-50%)" zIndex={'9999'}>
      <Center
        width={'48px'}
        height={'16px'}
        position={'absolute'}
        color={'white'}
        top={'-16px'}
        left={'50%'}
        transform={'translateX(-50%)'}
        cursor={'pointer'}
        bg="rgba(220, 220, 224, 0.3)"
        backdropFilter="blur(80px) saturate(150%)"
        boxShadow={
          '0px 0px 20px -4px rgba(12, 26, 67, 0.25), 0px 0px 1px 0px rgba(24, 43, 100, 0.25)'
        }
        borderTopRadius={'4px'}
        onClick={() => setNavbarVisible((prev) => !prev)}
      >
        <ChevronDownIcon
          transform={isNavbarVisible ? 'rotate(180deg)' : 'rotate(0deg)'}
          transition="transform 0.3s ease-in-out"
        />
      </Center>
      <Flex
        transition="all 0.3s ease-in-out"
        borderRadius="12px"
        border={'1px solid rgba(255, 255, 255, 0.07)'}
        bg="rgba(220, 220, 224, 0.3)"
        backdropFilter="blur(80px) saturate(150%)"
        boxShadow={
          '0px 0px 20px -4px rgba(12, 26, 67, 0.25), 0px 0px 1px 0px rgba(24, 43, 100, 0.25)'
        }
        minW={'326px'}
        w={'auto'}
        gap={'12px'}
        userSelect={'none'}
        px={'12px'}
        opacity={isNavbarVisible ? 1 : 0}
        overflow="hidden"
      >
        {isNavbarVisible &&
          AppMenuLists.map((item: AppInfo, index: number) => {
            return (
              <Flex
                flexDirection={'column'}
                alignItems={'center'}
                cursor={'pointer'}
                key={item?.name}
                pt={isNavbarVisible ? '6px' : 0}
                pb={isNavbarVisible ? '2px' : 0}
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
    </Box>
  );
}
