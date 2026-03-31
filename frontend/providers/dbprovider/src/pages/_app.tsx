import { theme } from '@/constants/theme';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useGlobalStore } from '@/store/global';
import { getDBVersion, getUserPrice } from '@/store/static';
import { getLangStore, setLangStore } from '@/utils/cookieUtils';
import { ChakraProvider } from '@chakra-ui/react';
import { dehydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import throttle from 'lodash/throttle';
import { appWithTranslation, useTranslation } from 'next-i18next';
import type { AppContext, AppInitialProps, AppProps } from 'next/app';
import Head from 'next/head';
import Router, { useRouter } from 'next/router';
import NProgress from 'nprogress';
import { useEffect, useState, useCallback, ComponentProps } from 'react';
import { EVENT_NAME } from 'sealos-desktop-sdk';
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app';
import '@sealos/driver/src/driver.css';
import '@/styles/reset.scss';
import 'nprogress/nprogress.css';
import Script from 'next/script';
import App from 'next/app';
import { useUserStore } from '@/store/user';
import {
  ClientConfigProvider,
  prefetchClientAppConfig,
  setupClientAppConfigDefaults
} from '@sealos/shared';
import { InsufficientQuotaDialog } from '@sealos/shared/chakra';
import { getClientAppConfigServer } from '@/pages/api/platform/getClientAppConfig';
import { useClientAppConfig } from '@/hooks/useClientAppConfig';
import { QuotaGuardProvider, type SupportedLang } from '@sealos/shared';

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

setupClientAppConfigDefaults(queryClient, ['client-app-config']);

type AppOwnProps = {
  customScripts: ComponentProps<typeof Script>[];
  dehydratedState?: unknown;
};

function AppContent({
  Component,
  pageProps,
  customScripts
}: {
  Component: AppProps['Component'];
  pageProps: AppProps['pageProps'];
  customScripts: ComponentProps<typeof Script>[];
}) {
  const router = useRouter();
  const { i18n } = useTranslation();
  const clientConfig = useClientAppConfig();
  const { setScreenWidth, loading, setLastRoute } = useGlobalStore();
  const { setSession } = useUserStore();
  const { Loading } = useLoading();
  const [refresh, setRefresh] = useState(false);
  const { openConfirm, ConfirmChild } = useConfirm({
    title: 'jump_prompt',
    content: 'not_allow_standalone_use'
  });

  const getSession = useCallback(() => {
    return useUserStore.getState().session ?? null;
  }, []);

  useEffect(() => {
    const response = createSealosApp();
    (async () => {
      try {
        const newSession = JSON.stringify(await sealosApp.getSession());
        setSession(JSON.parse(newSession));

        console.log('app init success');
      } catch (err) {
        console.log('App is not running in desktop');
        if (!process.env.NEXT_PUBLIC_MOCK_USER) {
          openConfirm(() => {
            window.open(`https://${clientConfig.desktopDomain}`, '_self');
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
          const whitelist = [`https://${clientConfig.desktopDomain}`];
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
  }, [clientConfig.desktopDomain, router]);

  return (
    <>
      <Head>
        <title>Sealos DB Provider</title>
        <meta name="description" content="Generated by Sealos Team" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ChakraProvider theme={theme}>
        <QuotaGuardProvider getSession={getSession} sealosApp={sealosApp}>
          <Component {...pageProps} />
          <InsufficientQuotaDialog lang={(i18n?.language || 'en') as SupportedLang} />
          <ConfirmChild />
          <Loading loading={loading} />
        </QuotaGuardProvider>
      </ChakraProvider>
      {customScripts.map((scriptProps, i) => (
        <Script key={i} {...scriptProps} />
      ))}
    </>
  );
}

function MyApp({ Component, pageProps, customScripts, dehydratedState }: AppProps & AppOwnProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ClientConfigProvider dehydratedState={dehydratedState}>
        <AppContent Component={Component} pageProps={pageProps} customScripts={customScripts} />
      </ClientConfigProvider>
    </QueryClientProvider>
  );
}

MyApp.getInitialProps = async (context: AppContext): Promise<AppOwnProps & AppInitialProps> => {
  const ctx = await App.getInitialProps(context);

  let customScripts: AppOwnProps['customScripts'] = [];
  let dehydratedState: unknown;

  if (typeof window === 'undefined') {
    try {
      const { Config } = await import('@/config');
      const config = Config();
      customScripts = config.dbprovider.ui.customScripts.map(
        (script): ComponentProps<typeof Script> => {
          const scriptProps: ComponentProps<typeof Script> = {
            id: script.id,
            strategy: script.strategy
          };

          if ('src' in script) {
            scriptProps.src = script.src;
          }

          if ('content' in script) {
            scriptProps.dangerouslySetInnerHTML = { __html: script.content };
          }

          return scriptProps;
        }
      );
    } catch (error) {
      console.error('[_app] Failed to read custom scripts:', error);
    }

    const qc = new QueryClient();
    await prefetchClientAppConfig(qc, ['client-app-config'], getClientAppConfigServer);
    dehydratedState = dehydrate(qc);
  }

  return { ...ctx, customScripts, dehydratedState };
};

export default appWithTranslation(MyApp);
