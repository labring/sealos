import { MoreAppsContext } from '@/pages/index';
import useAppStore, { AppInfo } from '@/stores/app';
import { useConfigStore } from '@/stores/config';
import { useDesktopConfigStore } from '@/stores/desktopConfig';
import { APPTYPE, TApp } from '@/types';
import { I18nCommonKey } from '@/types/i18next';
import { Box, Center, Flex, Image } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { MouseEvent, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Menu, useContextMenu } from 'react-contexify';
import { ChevronDownIcon } from '../icons';
import CustomTooltip from './CustomTooltip';
import styles from './index.module.css';

const APP_DOCK_MENU_ID = 'APP_DOCK_MENU_ID';

export default function AppDock() {
  const { t, i18n } = useTranslation();
  const {
    installedApps: apps,
    runningInfo,
    currentAppPid,
    openApp,
    switchAppById,
    findAppInfoById,
    updateOpenedAppInfo
  } = useAppStore();
  const logo = useConfigStore().layoutConfig?.logo;
  const moreAppsContent = useContext(MoreAppsContext);
  const { isNavbarVisible, toggleNavbarVisibility, getTransitionValue } = useDesktopConfigStore();
  const [isMouseOverDock, setIsMouseOverDock] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const { show } = useContextMenu({
    id: APP_DOCK_MENU_ID
  });
  const { toggleShape } = useDesktopConfigStore();
  const normalApps = apps.filter((item: TApp) => item?.displayType === 'normal');

  const AppMenuLists = useMemo(() => {
    const initialApps: TApp[] = [
      {
        name: 'home',
        icon: '/icons/home.svg',
        zIndex: 99999,
        isShow: false,
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
      ...normalApps.slice(0, 5).map((app, index) => ({ ...app, pid: -2 }))
    ];

    const mergedApps = initialApps.map((app) => {
      const runningApp = runningInfo.find((running) => running.key === app.key);
      return runningApp ? { ...app, ...runningApp } : app;
    });

    return [
      ...mergedApps,
      ...runningInfo.filter((running) => !initialApps.some((app) => app.key === running.key))
    ];
  }, [normalApps, runningInfo]);

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

  const displayMenu = (e: MouseEvent<HTMLDivElement>) => {
    show({
      event: e,
      position: {
        // @ts-ignore
        x: '244px',
        // @ts-ignore
        y: '-34px'
      }
    });
  };

  useEffect(() => {
    if (!isMouseOverDock) {
      const hasMaximizedApp = runningInfo.some((app) => app.size === 'maximize');
      toggleNavbarVisibility(!hasMaximizedApp);
    }
  }, [isMouseOverDock, runningInfo, toggleNavbarVisibility]);

  const handleMouseEnter = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsMouseOverDock(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = window.setTimeout(() => {
      setIsMouseOverDock(false);
    }, 500);
  };

  return (
    <Flex
      flexDirection={'column'}
      alignItems={'center'}
      position="absolute"
      p={'16px'}
      pb={'0px'}
      left="50%"
      bottom={'4px'}
      zIndex={'1000'}
      transition={getTransitionValue()}
      transform={isNavbarVisible ? 'translate(-50%, 0)' : 'translate(-50%, 64px)'}
      will-change="transform, opacity"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {runningInfo.length > 0 && runningInfo.some((app) => app.size === 'maximize') && (
        <Center
          width={'48px'}
          height={'16px'}
          color={'white'}
          transition={getTransitionValue()}
          cursor={'pointer'}
          bg="rgba(220, 220, 224, 0.3)"
          backdropFilter="blur(80px) saturate(150%)"
          boxShadow={
            '0px 0px 20px -4px rgba(12, 26, 67, 0.25), 0px 0px 1px 0px rgba(24, 43, 100, 0.25)'
          }
          borderTopRadius={'4px'}
          transform={isNavbarVisible ? 'translateY(0)' : 'translateY(-4px)'}
          will-change="transform, opacity"
          onClick={() => {
            toggleNavbarVisibility();
          }}
        >
          <ChevronDownIcon
            transform={isNavbarVisible ? 'rotate(0deg)' : 'rotate(180deg)'}
            transition="transform 200ms ease-in-out"
          />
        </Center>
      )}

      <Flex
        onContextMenu={(e) => displayMenu(e)}
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
      >
        {AppMenuLists.map((item: AppInfo, index: number) => {
          return (
            <CustomTooltip
              placement="top"
              key={item?.name}
              label={
                item?.i18n?.[i18n?.language]?.name
                  ? item?.i18n?.[i18n?.language]?.name
                  : t(item?.name as I18nCommonKey)
              }
            >
              <Flex
                flexDirection={'column'}
                alignItems={'center'}
                cursor={'pointer'}
                key={item?.name}
                pt={'6px'}
                pb={'2px'}
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
                    draggable={false}
                  />
                </Center>
                <Box
                  opacity={item?.isShow ? 1 : 0}
                  mt={'6px'}
                  width={'4px'}
                  height={'4px'}
                  borderRadius={'full'}
                  bg={'rgba(7, 27, 65, 0.50)'}
                ></Box>
              </Flex>
            </CustomTooltip>
          );
        })}
      </Flex>

      <Menu className={styles.contexify} id={APP_DOCK_MENU_ID}>
        <>
          <Box
            cursor={'pointer'}
            p={'4px'}
            _hover={{
              bg: 'rgba(17, 24, 36, 0.10)'
            }}
            onClick={toggleShape}
            borderRadius={'4px'}
          >
            {t('common:switching_disc')}
          </Box>
          <div className={styles.arrow}></div>
        </>
      </Menu>
    </Flex>
  );
}
