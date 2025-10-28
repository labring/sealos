import useAppStore from '@/stores/app';
import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import { compareFirstLanguages } from '@/utils/tools';
import { parseOpenappQuery } from '@/utils/format';
import { Box, Button, Flex, Image, Text, useColorMode } from '@chakra-ui/react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { createContext, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'next-i18next';
import { useAppDisplayConfigStore } from '@/stores/appDisplayConfig';
import { useDesktopConfigStore } from '@/stores/desktopConfig';
import AppWindow from '@/components/app_window';
import IframeWindow from '@/components/desktop_content/iframe_window';
import LoginModal from '@/components/LoginModal';
import 'react-contexify/dist/ReactContexify.css';
import Script from 'next/script';
import useScriptStore from '@/stores/script';
import { createMasterAPP, masterApp } from 'sealos-desktop-sdk/master';

const AppDock = dynamic(() => import('@/components/AppDock'), { ssr: false });
const FloatButton = dynamic(() => import('@/components/floating_button'), { ssr: false });
const Apps = dynamic(() => import('@/components/desktop_content/apps'), { ssr: false });

interface IMoreAppsContext {
  showMoreApps: boolean;
  setShowMoreApps: (value: boolean) => void;
}
export const MoreAppsContext = createContext<IMoreAppsContext | null>(null);

export default function GuestDesktop() {
  const router = useRouter();
  const { i18n, t } = useTranslation();
  const {
    isUserLogin,
    setGuestSession,
    showGuestLoginModal,
    closeGuestLoginModal,
    openGuestLoginModal
  } = useSessionStore();
  const { colorMode, toggleColorMode } = useColorMode();
  const init = useAppStore((state) => state.init);
  const setAutoLaunch = useAppStore((state) => state.setAutoLaunch);
  const { runningInfo } = useAppStore();
  const { backgroundImage: desktopBackgroundImage } = useAppDisplayConfigStore();
  const { isAppBar } = useDesktopConfigStore();
  const [isClient, setIsClient] = useState(false);
  const { layoutConfig, authConfig, cloudConfig } = useConfigStore();
  const { setCaptchaIsLoad } = useScriptStore();

  // Client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Force light mode
  useEffect(() => {
    colorMode === 'dark' ? toggleColorMode() : null;
  }, [colorMode, toggleColorMode]);

  const [showMoreApps, setShowMoreApps] = useState(false);

  useEffect(() => {
    const initGuest = async () => {
      const { query } = router;

      setGuestSession();
      closeGuestLoginModal();

      const state = await init();

      const { appkey, appQuery, appPath } = parseOpenappQuery((query?.openapp as string) || '');
      if (appkey) {
        const app = state.installedApps.find((item) => item.key === appkey);
        if (app) {
          state.openApp(app, { raw: appQuery, pathname: appPath });
        }
      }
    };

    initGuest();
  }, [closeGuestLoginModal, init, router, router.query?.openapp, setGuestSession]);

  // Initialize masterApp for iframe communication
  useEffect(() => {
    const cleanup = createMasterAPP(cloudConfig?.allowedOrigins || ['*']);
    return cleanup;
  }, [cloudConfig?.allowedOrigins]);

  /**
   * request_login message:
   * sealosApp.emitToDesktop('request_login', {
   *   appName: 'system-brain',
   *   pathname: '/trial',
   *   query: 'query=deploy-agent&sessionID=zjy'
   * })
   */
  useEffect(() => {
    const cleanup = masterApp?.addEventListen('request_login', (data: any) => {
      console.log('Guest Mode: Received request_login from Brain:', data);
      // Save app launch state before login
      if (data?.appName) {
        const launchQuery = {
          pathname: data.pathname || '/',
          raw: data.query || ''
        };
        console.log('Guest Mode: Saving autolaunch state:', data.appName, launchQuery);
        setAutoLaunch(data.appName, launchQuery, undefined);
      }

      openGuestLoginModal();
    });
    return cleanup;
  }, [openGuestLoginModal, setAutoLaunch]);

  return (
    <Box position={'relative'} overflow={'hidden'} w="100vw" h="100vh">
      <Head>
        <title>{layoutConfig?.meta.title}</title>
        <meta name="description" content={layoutConfig?.meta.description} />
        <link rel="shortcut icon" href={layoutConfig?.logo ? layoutConfig?.logo : '/favicon.ico'} />
        <link rel="icon" href={layoutConfig?.logo ? layoutConfig?.logo : '/favicon.ico'} />
      </Head>
      {authConfig?.captcha.ali.enabled && (
        <Script
          src="https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js"
          onLoad={() => {
            setCaptchaIsLoad();
          }}
        />
      )}
      <MoreAppsContext.Provider value={{ showMoreApps, setShowMoreApps }}>
        <Box id="desktop" position={'relative'} w="100%" h="100%">
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            zIndex={-10}
            overflow="hidden"
          >
            <Image
              src={desktopBackgroundImage || '/images/bg-light.svg'}
              alt="background"
              width="100%"
              height="100vh"
              objectFit="cover"
              objectPosition="bottom"
            />
          </Box>

          {isClient && (
            <Flex
              height="68px"
              px={{ base: '16px', md: '32px' }}
              alignItems="center"
              justifyContent="space-between"
              borderBottom="1px solid"
              borderColor="gray.200"
              bg="white"
            >
              <Flex alignItems="center" gap="12px">
                <Text fontSize="18px" fontWeight="600" color="gray.800">
                  {t('v2:guest_mode')}
                </Text>
                <Text fontSize="14px" color="gray.500">
                  {t('v2:guest_mode_login_tip')}
                </Text>
              </Flex>
              <Button onClick={openGuestLoginModal} colorScheme="blue">
                {t('v2:login_sign_up')}
              </Button>
            </Flex>
          )}

          <Flex
            width={'100%'}
            height={'calc(100% - 68px)'}
            pt={{ base: '20px', md: '80px', xl: '120px' }}
            maxW={'1074px'}
            pb={'84px'}
            mx={'auto'}
            position={'relative'}
          >
            <Flex
              flexDirection={'column'}
              gap={'8px'}
              flex={1}
              position={'relative'}
              width={'100%'}
            >
              {isClient && <Apps />}
            </Flex>
          </Flex>

          {isClient && (isAppBar ? <AppDock /> : <FloatButton />)}

          {runningInfo.map((process) => {
            return (
              <AppWindow key={process.pid} style={{ height: '100vh' }} pid={process.pid}>
                <IframeWindow pid={process.pid} />
              </AppWindow>
            );
          })}

          <LoginModal isOpen={showGuestLoginModal} onClose={closeGuestLoginModal} />
        </Box>
      </MoreAppsContext.Provider>
    </Box>
  );
}

export async function getServerSideProps({ req, res, locales }: any) {
  const local =
    req?.cookies?.NEXT_LOCALE || compareFirstLanguages(req?.headers?.['accept-language'] || 'zh');
  res.setHeader('Set-Cookie', `NEXT_LOCALE=${local}; Max-Age=2592000; Secure; SameSite=None`);

  return {
    props: {
      ...(await serverSideTranslations(
        local,
        ['common', 'cloudProviders', 'error', 'applist', 'v2'],
        null,
        locales || []
      ))
    }
  };
}
