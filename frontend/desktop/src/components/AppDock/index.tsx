import { MoreAppsContext } from '@/pages/index';
import useAppStore, { AppInfo } from '@/stores/app';
import { useConfigStore } from '@/stores/config';
import { useDesktopConfigStore } from '@/stores/desktopConfig';
import { APPTYPE, TApp } from '@/types';
import { I18nCommonKey } from '@/types/i18next';
import { Box, Center, Flex, Image, useBreakpointValue } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { MouseEvent, useContext, useMemo, useRef, useState } from 'react';
import { useContextMenu } from 'react-contexify';
import { ChevronDownIcon } from '../icons';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { gtmOpenCostcenter } from '@/utils/gtm';

const APP_DOCK_MENU_ID = 'APP_DOCK_MENU_ID';

const MotionFlex = motion(Flex);
const MotionCenter = motion(Center);
const MotionBox = motion(Box);

function StaticIcon({ item, logo, t, i18n, handleNavItem }: any) {
  const [staticHovered, setStaticHovered] = useState(false);

  return (
    <Flex
      flexDirection={'column'}
      alignItems={'center'}
      cursor={'pointer'}
      pt={'6px'}
      pb={'2px'}
      onClick={(e) => handleNavItem(e, item)}
      position="relative"
      onMouseEnter={() => setStaticHovered(true)}
      onMouseLeave={() => setStaticHovered(false)}
    >
      <Center
        w="54px"
        h="54px"
        borderRadius={'16px'}
        bg={'rgba(255, 255, 255, 0.85)'}
        backdropFilter={'blur(25px)'}
        boxShadow={' 0px 5.634px 8.451px -1.69px rgba(0, 0, 0, 0.05)'}
        overflow={'hidden'}
      >
        <Image
          src={item?.icon}
          fallbackSrc={logo || '/logo.svg'}
          alt={item?.name}
          w="100%"
          h="100%"
          draggable={false}
        />
      </Center>
      <Box
        opacity={item?.isShow ? 1 : 0}
        mt={'4px'}
        width={'6px'}
        height={'6px'}
        borderRadius={'full'}
        bg={'rgba(0, 0, 0, 0.50)'}
      ></Box>

      {staticHovered && (
        <Box
          position="absolute"
          top="-40px"
          bg="white"
          borderRadius="6px"
          px="10px"
          py="5px"
          fontSize="12px"
          fontWeight="medium"
          whiteSpace="nowrap"
          boxShadow="0px 2px 4px rgba(0, 0, 0, 0.1)"
        >
          {item?.i18n?.[i18n?.language]?.name
            ? item?.i18n?.[i18n?.language]?.name
            : t(item?.name as I18nCommonKey)}
        </Box>
      )}
    </Flex>
  );
}

function AnimatedIcon({ item, logo, t, i18n, handleNavItem, mouseX }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [54, 70, 54]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [54, 70, 54]);

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12
  });

  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12
  });

  return (
    <MotionFlex
      ref={ref}
      flexDirection={'column'}
      alignItems={'center'}
      cursor={'pointer'}
      pt={'6px'}
      pb={'2px'}
      position="relative"
      zIndex={hovered || Math.abs(distance.get()) < 50 ? 10 : 1}
      onClick={(e) => handleNavItem(e, item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <MotionCenter
        style={{
          width,
          height,
          y: useTransform(width, [54, 70], [0, -8])
        }}
        borderRadius={'16px'}
        position="relative"
        bg={'rgba(255, 255, 255, 0.85)'}
        backdropFilter={'blur(25px)'}
        border={'1px solid rgba(0, 0, 0, 0.05)'}
        boxShadow={'0px 5.634px 8.451px -1.69px rgba(0, 0, 0, 0.05)'}
        overflow={'hidden'}
      >
        <Image
          src={item?.icon}
          fallbackSrc={logo || '/logo.svg'}
          alt={item?.name}
          w="100%"
          h="100%"
          draggable={false}
        />
      </MotionCenter>
      <MotionBox
        opacity={item?.isShow ? 1 : 0}
        mt={'4px'}
        width={'6px'}
        height={'6px'}
        borderRadius={'full'}
        bg={'rgba(0, 0, 0, 0.50)'}
      ></MotionBox>
      <AnimatePresence>
        {hovered && (
          <MotionBox
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 2 }}
            position="absolute"
            top="-40px"
            borderRadius="6px"
            px="10px"
            py="5px"
            fontSize="12px"
            fontWeight="medium"
            whiteSpace="nowrap"
            boxShadow="0px 2px 4px rgba(0, 0, 0, 0.1)"
            bg="white"
            color={'#18181B'}
          >
            {item?.i18n?.[i18n?.language]?.name
              ? item?.i18n?.[i18n?.language]?.name
              : t(item?.name as I18nCommonKey)}
          </MotionBox>
        )}
      </AnimatePresence>
    </MotionFlex>
  );
}

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
  const isSmallScreen = useBreakpointValue({ base: true, sm: false });
  const mouseX = useMotionValue(Infinity);

  const { show } = useContextMenu({
    id: APP_DOCK_MENU_ID
  });
  const { toggleShape } = useDesktopConfigStore();
  const normalApps = apps.filter((item: TApp) => item?.displayType === 'normal');

  const AppMenuLists = useMemo(() => {
    const initialApps: TApp[] = [
      {
        name: 'home',
        icon: '/icons/my-home.svg',
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
    if (item.key === 'system-costcenter') {
      gtmOpenCostcenter();
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

  const handleMouseEnter = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsMouseOverDock(true);
  };

  const handleMouseLeave = () => {
    mouseX.set(Infinity);

    timeoutRef.current = window.setTimeout(() => {
      setIsMouseOverDock(false);
    }, 500);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSmallScreen) {
      mouseX.set(e.clientX);
    }
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
      transform={isNavbarVisible ? 'translate(-50%, 0)' : 'translate(-50%, 82px)'}
      will-change="transform, opacity"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Center
        width={'72px'}
        height={'20px'}
        color={'white'}
        transition={getTransitionValue()}
        cursor={'pointer'}
        borderRadius={'12px'}
        border={'0.5px solid rgba(255, 255, 255, 0.07)'}
        bg={'rgba(245, 245, 245, 0.30)'}
        backdropFilter={'blur(25px)'}
        boxShadow={'0px 0px 1px 0px rgba(0, 0, 0, 0.25), 0px 5px 10px -1.69px rgba(0, 0, 0, 0.08)'}
        transform={isNavbarVisible ? 'translateY(0)' : 'translateY(-4px)'}
        will-change="transform, opacity"
        onClick={() => {
          toggleNavbarVisibility();
        }}
      >
        <ChevronDownIcon
          w={'20px'}
          h={'20px'}
          transform={isNavbarVisible ? 'rotate(0deg)' : 'rotate(180deg)'}
          transition="transform 200ms ease-in-out"
        />
      </Center>

      <Flex
        borderRadius="22px"
        border={'0.5px solid rgba(255, 255, 255, 0.07)'}
        bg="rgba(245, 245, 245, 0.30)"
        backdropFilter="blur(25px)"
        boxShadow={'0px 0px 1px 0px rgba(0, 0, 0, 0.25), 0px 5px 10px -1.69px rgba(0, 0, 0, 0.08)'}
        minW={'326px'}
        w={'auto'}
        gap={'12px'}
        userSelect={'none'}
        px={'12px'}
        h={'78px'}
        alignItems={'flex-end'}
        overflow="visible"
        onMouseMove={handleMouseMove}
      >
        {AppMenuLists.map((item: AppInfo, index: number) =>
          isSmallScreen ? (
            <StaticIcon
              key={item?.name + index}
              item={item}
              logo={logo}
              t={t}
              i18n={i18n}
              handleNavItem={handleNavItem}
            />
          ) : (
            <AnimatedIcon
              key={item?.name + index}
              item={item}
              logo={logo}
              t={t}
              i18n={i18n}
              handleNavItem={handleNavItem}
              mouseX={mouseX}
            />
          )
        )}
      </Flex>
    </Flex>
  );
}
