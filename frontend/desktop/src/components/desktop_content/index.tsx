import { getGlobalNotification } from '@/api/platform';
import AppWindow from '@/components/app_window';
import useDriver from '@/hooks/useDriver';
import useAppStore from '@/stores/app';
import { useConfigStore } from '@/stores/config';
import { TApp, WindowSize } from '@/types';
import { Box, Flex, useDisclosure } from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { MouseEvent, useCallback, useEffect, useState } from 'react';
import { createMasterAPP, masterApp } from 'sealos-desktop-sdk/master';
import AppDock from '../AppDock';
import { ChakraIndicator } from './ChakraIndicator';
import Apps from './apps';
import IframeWindow from './iframe_window';
import styles from './index.module.scss';
import DesktopProvider from './providers';
import Cost from '../account/cost';
const Account = dynamic(() => import('../account'), { ssr: false });

export const blurBackgroundStyles = {
  bg: 'rgba(22, 30, 40, 0.35)',
  backdropFilter: 'blur(80px) saturate(150%)',
  border: 'none',
  borderRadius: '12px'
};

export default function Desktop(props: any) {
  const { t, i18n } = useTranslation();
  const { installedApps: apps, runningInfo, openApp, setToHighestLayerById } = useAppStore();
  const backgroundImage = useConfigStore().layoutConfig?.backgroundImage;
  const logo = useConfigStore().layoutConfig?.logo;
  const renderApps = apps.filter((item: TApp) => item?.displayType === 'normal');
  const [maxItems, setMaxItems] = useState(10);
  const { message } = useMessage();
  const desktopDisclosure = useDisclosure();

  const handleDoubleClick = (e: MouseEvent<HTMLDivElement>, item: TApp) => {
    e.preventDefault();
    if (item?.name) {
      openApp(item);
    }
  };

  /**
   * Open Desktop Application
   *
   * @param {object} options - Options for opening the application
   * @param {string} options.appKey - Unique identifier key for the application
   * @param {object} [options.query={}] - Query parameter object
   * @param {object} [options.messageData={}] - Message data to be sent to the application
   * @param {string} options.pathname - Path when the application opens
   *
   * Logic:
   * - Find information about the application and its running state
   * - If the application does not exist, exit
   * - If the application is not open (not running), call the openApp method to open it
   * - If the application is already open (running), bring it to the highest layer
   * - Send a postMessage to the application window to handle the message data
   */
  const openDesktopApp = useCallback(
    ({
      appKey,
      query = {},
      messageData = {},
      pathname = '/',
      appSize = 'maximize'
    }: {
      appKey: string;
      query?: Record<string, string>;
      messageData?: Record<string, any>;
      pathname: string;
      appSize?: WindowSize;
    }) => {
      const app = apps.find((item) => item.key === appKey);
      const runningApp = runningInfo.find((item) => item.key === appKey);
      if (!app) return;
      openApp(app, { query, pathname, appSize });
      if (runningApp) {
        setToHighestLayerById(runningApp.pid);
      }
      // post message
      const iframe = document.getElementById(`app-window-${appKey}`) as HTMLIFrameElement;
      if (!iframe) return;
      iframe.contentWindow?.postMessage(messageData, app.data.url);
    },
    [apps, openApp, runningInfo, setToHighestLayerById]
  );

  useEffect(() => {
    return createMasterAPP();
  }, []);

  useEffect(() => {
    return masterApp?.addEventListen('openDesktopApp', openDesktopApp);
  }, [openDesktopApp]);

  const { UserGuide, showGuide } = useDriver({ openDesktopApp });

  useQuery(['getGlobalNotification'], getGlobalNotification, {
    onSuccess(data) {
      const newID = data.data?.metadata?.uid;
      if (!newID || newID === localStorage.getItem('GlobalNotification')) return;
      localStorage.setItem('GlobalNotification', newID);
      const title =
        i18n.language === 'zh' && data.data?.spec?.i18ns?.zh?.message
          ? data.data?.spec?.i18ns?.zh?.message
          : data.data?.spec?.message;
      message({
        title: title,
        status: 'info',
        duration: null
      });
    }
  });

  return (
    <DesktopProvider>
      <Box
        id="desktop"
        className={styles.desktop}
        backgroundImage={`url(${backgroundImage || '/images/bg-blue.jpg'})`}
        backgroundRepeat={'no-repeat'}
        backgroundSize={'cover'}
      >
        <ChakraIndicator />
        <Flex
          gap={'8px'}
          width={'100%'}
          height={'calc(100% - 87px)'}
          pt={'24px'}
          px={'24px'}
          mx={'auto'}
          maxW={'1232px'}
        >
          {/* monitor  */}
          <Flex
            flex={'0 0 250px'}
            flexDirection={'column'}
            display={{
              base: 'none',
              xl: 'flex'
            }}
            gap={'8px'}
          >
            <Flex height={'48px'} {...blurBackgroundStyles}>
              Sealos 小助理
            </Flex>
            <Flex flex={1} {...blurBackgroundStyles}>
              asdasdasxx
            </Flex>
          </Flex>

          {/* apps padding-right: 266px + 4px */}
          <Flex
            flexDirection={'column'}
            gap={'8px'}
            flex={1}
            // pr={{ base: '0px', lg: '270px' }}
          >
            <Flex flexShrink={0} height={'48px'} {...blurBackgroundStyles}>
              搜索应用
            </Flex>
            <Apps />
          </Flex>

          {/* user account */}
          <Flex
            display={{ base: 'none', lg: 'flex' }}
            flex={'0 0 266px'}
            flexDirection={'column'}
            gap={'8px'}
            // position={'absolute'}
            width={'266px'}
            // right={'20px'}
          >
            <Account />
            <Cost />
          </Flex>

          {showGuide ? (
            <>
              <UserGuide />
              <Box
                position="fixed"
                top="0"
                left="0"
                width="100%"
                height="100%"
                backgroundColor="rgba(0, 0, 0, 0.7)" // 半透明黑色背景
                zIndex="11000" // 保证蒙层在最上层
              />
            </>
          ) : (
            <></>
          )}

          <AppDock />
        </Flex>

        {/* opened apps */}
        {runningInfo.map((process) => {
          return (
            <AppWindow key={process.pid} style={{ height: '100vh' }} pid={process.pid}>
              <IframeWindow pid={process.pid} />
            </AppWindow>
          );
        })}
      </Box>
    </DesktopProvider>
  );
}
