import { theme } from '@/constants/theme';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useGlobalStore } from '@/store/global';
import { getDBVersion, getUserPrice } from '@/store/static';
import { getLangStore, setLangStore } from '@/utils/cookieUtils';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import throttle from 'lodash/throttle';
import { appWithTranslation, useTranslation } from 'next-i18next';
import type { AppContext, AppInitialProps, AppProps } from 'next/app';
import Head from 'next/head';
import Router, { useRouter } from 'next/router';
import NProgress from 'nprogress';
import { useEffect, useState } from 'react';
import { EVENT_NAME } from 'sealos-desktop-sdk';
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app';
import useEnvStore from '@/store/env';
import '@sealos/driver/src/driver.css';
import '@/styles/reset.scss';
import 'nprogress/nprogress.css';
import Script from 'next/script';
import App from 'next/app';
import { useUserStore } from '@/store/user';

//Binding events.
Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', () => NProgress.done());

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      cacheTime: 0
    }
  }
});

type AppOwnProps = {
  customScripts: { [key: string]: string }[];
};

function MyApp({ Component, pageProps, customScripts }: AppProps & AppOwnProps) {
  const router = useRouter();
  const { i18n } = useTranslation();
  const { SystemEnv, initSystemEnv } = useEnvStore();
  const { setScreenWidth, loading, setLastRoute } = useGlobalStore();
  const { setSession } = useUserStore();
  const { Loading } = useLoading();
  const [refresh, setRefresh] = useState(false);
  const { openConfirm, ConfirmChild } = useConfirm({
    title: 'jump_prompt',
    content: 'not_allow_standalone_use'
  });

  useEffect(() => {
    const response = createSealosApp();
    (async () => {
      const { desktopDomain } = await initSystemEnv();
      try {
        const newSession = JSON.stringify(await sealosApp.getSession());
        setSession(JSON.parse(newSession));

        console.log('app init success');
      } catch (err) {
        console.log('App is not running in desktop');
        if (!process.env.NEXT_PUBLIC_MOCK_USER) {
          openConfirm(() => {
            window.open(`https://${desktopDomain}`, '_self');
          })();
        }
      }
    })();
    return response;
  }, []);

  // add resize event
  useEffect(() => {
    const resize = throttle((e: Event) => {
      const documentWidth = document.documentElement.clientWidth || document.body.clientWidth;
      setScreenWidth(documentWidth);
    }, 200);
    window.addEventListener('resize', resize);
    const documentWidth = document.documentElement.clientWidth || document.body.clientWidth;
    setScreenWidth(documentWidth);

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [setScreenWidth]);

  // init
  useEffect(() => {
    getUserPrice();
    getDBVersion();

    const changeI18n = async (data: any) => {
      const lastLang = getLangStore();
      const newLang = data.currentLanguage;
      if (lastLang !== newLang && typeof i18n?.changeLanguage === 'function') {
        i18n?.changeLanguage(newLang);
        setLangStore(newLang);
        setRefresh((state) => !state);
      }
    };

    (async () => {
      try {
        const lang = await sealosApp.getLanguage();
        changeI18n({
          currentLanguage: lang.lng
        });
      } catch (error) {
        changeI18n({
          currentLanguage: 'en'
        });
      }
    })();

    return sealosApp?.addAppEventListen(EVENT_NAME.CHANGE_I18N, changeI18n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // record route
  useEffect(() => {
    return () => {
      setLastRoute(router.asPath);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.pathname]);

  useEffect(() => {
    const lang = getLangStore() || 'zh';
    i18n?.changeLanguage?.(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, router.asPath]);

  useEffect(() => {
    const setupInternalAppCallListener = async () => {
      try {
        const event = async (e: MessageEvent) => {
          const whitelist = [`https://${SystemEnv.desktopDomain}`];
          if (!whitelist.includes(e.origin)) {
            return;
          }
          try {
            if (e.data?.type === 'InternalAppCall' && e.data?.name) {
              router.push({
                pathname: '/redirect',
                query: {
                  name: e.data.name
                }
              });
            }

            if (e.data?.action === 'guide') {
              router.push({
                pathname: '/redirect',
                query: {
                  action: e.data.action
                }
              });
            }
          } catch (error) {
            console.log(error, 'error');
          }
        };
        window.addEventListener('message', event);
        return () => window.removeEventListener('message', event);
      } catch (error) {}
    };
    setupInternalAppCallListener();
  }, [SystemEnv.desktopDomain, router]);

  return (
    <>
      <Head>
        <title>Sealos DB Provider</title>
        <meta name="description" content="Generated by Sealos Team" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <Component {...pageProps} />
          <ConfirmChild />
          <Loading loading={loading} />
        </ChakraProvider>
      </QueryClientProvider>
      {customScripts.map((script, i) => (
        <Script strategy="afterInteractive" key={i} {...script} />
      ))}
    </>
  );
}

MyApp.getInitialProps = async (context: AppContext): Promise<AppOwnProps & AppInitialProps> => {
  const ctx = await App.getInitialProps(context);

  let customScripts: AppOwnProps['customScripts'] = [];

  try {
    if (typeof window === 'undefined') {
      customScripts = JSON.parse(process.env.CUSTOM_SCRIPTS ?? '[]');
    }
  } catch (error) {
    console.error('Failed to inject custom scripts:', error);
  }

  return { ...ctx, customScripts };
};

export default appWithTranslation(MyApp);
