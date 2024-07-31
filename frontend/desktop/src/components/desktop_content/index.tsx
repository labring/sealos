import { getGlobalNotification } from '@/api/platform';
import AppWindow from '@/components/app_window';
// import useDriver from '@/hooks/useDriver';
import { LicenseFrontendKey } from '@/constants/account';
import useAppStore from '@/stores/app';
import { useConfigStore } from '@/stores/config';
import { useDesktopConfigStore } from '@/stores/desktopConfig';
import { WindowSize } from '@/types';
import { Box, Flex } from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { createMasterAPP, masterApp } from 'sealos-desktop-sdk/master';
import Cost from '../account/cost';
import TriggerAccountModule from '../account/trigger';
import { ChakraIndicator } from './ChakraIndicator';
import Apps from './apps';
import Assistant from './assistant';
import IframeWindow from './iframe_window';
import styles from './index.module.scss';
import Monitor from './monitor';
import SearchBox from './searchBox';
import Warn from './warn';
import NeedToMerge from '../account/AccountCenter/mergeUser/NeedToMergeModal';
import { useRealAuthNotification } from '../account/RealNameModal';
import useSessionStore from '@/stores/session';

const AppDock = dynamic(() => import('../AppDock'), { ssr: false });
const FloatButton = dynamic(() => import('@/components/floating_button'), { ssr: false });
const Account = dynamic(() => import('../account'), { ssr: false });

export const blurBackgroundStyles = {
  bg: 'rgba(22, 30, 40, 0.35)',
  backdropFilter: 'blur(80px) saturate(150%)',
  border: 'none',
  borderRadius: '12px'
};

export default function Desktop(props: any) {
  const { i18n } = useTranslation();
  const { isAppBar } = useDesktopConfigStore();
  const { installedApps: apps, runningInfo, openApp, setToHighestLayerById } = useAppStore();
  const backgroundImage = useConfigStore().layoutConfig?.backgroundImage;
  const { message } = useMessage();
  const { realAuthNotification } = useRealAuthNotification();
  const [showAccount, setShowAccount] = useState(false);
  const { layoutConfig } = useConfigStore();
  const { session } = useSessionStore();
  const { commonConfig } = useConfigStore();

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
    const cleanup = createMasterAPP();
    return cleanup;
  }, []);

  useEffect(() => {
    const cleanup = masterApp?.addEventListen('openDesktopApp', openDesktopApp);
    return cleanup;
  }, [openDesktopApp]);

  useEffect(() => {
    if (!session?.user?.realName && commonConfig?.realNameAuthEnabled) {
      realAuthNotification({
        title: '国内可用区需要实名认证，未实名认证将会被限制使用，点击进行实名',
        status: 'error',
        duration: null,
        isClosable: true
      });
    }
  }, [session, commonConfig]);

  // const { UserGuide, showGuide } = useDriver({ openDesktopApp });

  useEffect(() => {
    const globalNotification = async () => {
      const data = await getGlobalNotification();
      const newID = data.data?.metadata?.uid;

      const title =
        i18n.language === 'zh' && data.data?.spec?.i18ns?.zh?.message
          ? data.data?.spec?.i18ns?.zh?.message
          : data.data?.spec?.message;

      if (data.data?.metadata?.labels?.[LicenseFrontendKey]) {
        message({
          title: title,
          status: 'info',
          duration: null
        });
      } else {
        if (!newID || newID === localStorage.getItem('GlobalNotification')) return;
        localStorage.setItem('GlobalNotification', newID);
        message({
          title: title,
          status: 'info',
          duration: null
        });
      }
    };
    globalNotification();
  }, []);

  return (
    <Box
      id="desktop"
      className={styles.desktop}
      backgroundImage={`url(${backgroundImage || '/images/bg-blue.svg'})`}
      backgroundRepeat={'no-repeat'}
      backgroundSize={'cover'}
      position={'relative'}
    >
      <ChakraIndicator />
      <Flex
        gap={'8px'}
        width={'100%'}
        height={'calc(100% - 87px)'}
        pt={'24px'}
        px={'24px'}
        mx={'auto'}
        maxW={'1300px'}
        maxH={'1000px'}
        position={'relative'}
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
          {layoutConfig?.common.aiAssistantEnabled && <Assistant />}
          <Monitor />
          <Warn />
        </Flex>

        {/* apps */}
        <Flex flexDirection={'column'} gap={'8px'} flex={1} position={'relative'}>
          <Flex zIndex={2} flexShrink={0} height={{ base: '32px', sm: '48px' }} gap={'8px'}>
            <Box display={{ base: 'block', xl: 'none' }}>
              {layoutConfig?.common.aiAssistantEnabled && <Assistant />}
            </Box>
            <SearchBox />
            <TriggerAccountModule showAccount={showAccount} setShowAccount={setShowAccount} />
          </Flex>
          <Apps />
        </Flex>

        {/* user account */}
        <Box position={'relative'}>
          {showAccount && (
            <Box
              position={'fixed'}
              inset={0}
              zIndex={2}
              onClick={(e) => {
                e.stopPropagation();
                setShowAccount(false);
              }}
            ></Box>
          )}
          <Box
            display={{ base: showAccount ? 'flex' : 'none', lg: 'flex' }}
            position={{ base: 'absolute', lg: 'relative' }}
            right={{ base: '0px', lg: 'auto' }}
            top={{ base: '0px', lg: 'auto' }}
            flexDirection={'column'}
            gap={'8px'}
            flex={'0 0 266px'}
            width={'266px'}
            h={'full'}
            zIndex={3}
          >
            <Account />
            <Cost />
          </Box>
        </Box>

        {/* {showGuide ? (
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
        )} */}
      </Flex>

      {isAppBar ? <AppDock /> : <FloatButton />}

      {/* opened apps */}
      {runningInfo.map((process) => {
        return (
          <AppWindow key={process.pid} style={{ height: '100vh' }} pid={process.pid}>
            <IframeWindow pid={process.pid} />
          </AppWindow>
        );
      })}
      {/* modal */}
      <NeedToMerge />
    </Box>
  );
}
