import Layout from '@/components/layout';
import { theme } from '@/constants/theme';
import { useGlobalStore } from '@/store/global';
import { getLangStore, setLangStore } from '@/utils/cookieUtils';
import { ChakraProvider } from '@chakra-ui/react';
import { dehydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { appWithTranslation, useTranslation } from 'next-i18next';
import type { AppContext, AppInitialProps, AppProps } from 'next/app';
import Head from 'next/head';
import Router, { useRouter } from 'next/router';
import NProgress from 'nprogress'; //nprogress module
import { useEffect, useState, useCallback, ComponentProps } from 'react';
import { EVENT_NAME } from 'sealos-desktop-sdk';
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app';
import { useSidebarStore } from '@/store/sidebar';
import useSessionStore from '@/store/session';
import { useUserStore } from '@/store/user';
import {
  ClientConfigProvider,
  prefetchClientAppConfig,
  setupClientAppConfigDefaults
} from '@sealos/shared';
import { getClientAppConfigServer } from '@/pages/api/platform/getClientAppConfig';

import '@sealos/driver/src/driver.css';
import '@/styles/reset.scss';
import 'nprogress/nprogress.css';
import { useGuideStore } from '@/store/guide';
import App from 'next/app';
import Script from 'next/script';
import { InsufficientQuotaDialog, type SupportedLang } from '@sealos/shared/chakra';
import { QuotaGuardProvider } from '@sealos/shared';
import { Config } from '@/config';
import type { CustomScript } from '@/types/config';
import { useClientAppConfig } from '@/hooks/useClientAppConfig';

//Binding events.
Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', () => NProgress.done());

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
  brandName: string;
  customScripts: CustomScript[];
  dehydratedState?: unknown;
};

function AppContent({
  Component,
  pageProps,
  brandName
}: {
  Component: AppProps['Component'];
  pageProps: AppProps['pageProps'];
  brandName: string;
}) {
  const router = useRouter();
  const { setSession } = useSessionStore();
  const { i18n } = useTranslation();
  const { setLastRoute } = useGlobalStore();
  const { initMenuKeys } = useSidebarStore();
  const [refresh, setRefresh] = useState(false);
  const { loadUserSourcePrice } = useUserStore();
  const clientAppConfig = useClientAppConfig();

  const getSession = useCallback(() => {
    return useSessionStore.getState().session ?? null;
  }, []);

  useEffect(() => {
    initMenuKeys(i18n.language);
    loadUserSourcePrice();
  }, [i18n.language, initMenuKeys]);

  useEffect(() => {
    NProgress.start();
    const response = createSealosApp();
    (async () => {
      try {
        const res = await sealosApp.getSession();
        setSession(res);
      } catch (err) {
        console.log('App is not running in desktop');
      }
    })();
    localStorage.removeItem('session');
    NProgress.done();
    return response;
  }, []);

  useEffect(() => {
    const changeI18n = async (data: any) => {
      const lastLang = getLangStore();
      const newLang = data.currentLanguage;
      if (lastLang !== newLang && i18n?.changeLanguage) {
        i18n.changeLanguage(newLang);
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
        console.warn('get desktop getLanguage error');
      }
    })();
    return sealosApp?.addAppEventListen(EVENT_NAME.CHANGE_I18N, changeI18n);
  }, []);

  // record route
  useEffect(() => {
    return () => {
      setLastRoute(router.asPath);
    };
  }, [router.pathname]);

  useEffect(() => {
    const lang = getLangStore();
    if (lang) {
      i18n?.changeLanguage?.(lang);
    }
  }, [i18n, refresh, router.pathname]);

  useEffect(() => {
    const setupInternalAppCallListener = async () => {
      try {
        const event = async (
          e: MessageEvent<{
            name: string;
            type: string;
            action?: string;
          }>
        ) => {
          const whitelist = [`https://${clientAppConfig.desktopDomain}`];
          if (!whitelist.includes(e.origin)) {
            return;
          }
          try {
            if (e.data.type === 'InternalAppCall' && e.data?.name) {
              router.push({
                pathname: '/instance',
                query: {
                  instanceName: e.data.name
                }
              });
            }
            if (e.data?.action === 'guide') {
              router.push({
                pathname: '/'
              });
              useGuideStore.getState().resetGuideState(false);
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
  }, []);

  return (
    <>
      <Head>
        <title>{`${brandName} Templates`}</title>
        <meta name="application-name" content={`${brandName} Templates`} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={brandName} />
        <meta name="description" content={`Created by ${brandName} Team`} />
        <meta name="format-detection" content="telephone=no" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ChakraProvider theme={theme}>
        <QuotaGuardProvider getSession={getSession} sealosApp={sealosApp}>
          <Layout>
            <Component {...pageProps} />
          </Layout>
          <InsufficientQuotaDialog lang={(i18n?.language || 'en') as SupportedLang} />
        </QuotaGuardProvider>
      </ChakraProvider>
    </>
  );
}

const MyApp = ({
  Component,
  pageProps,
  brandName,
  customScripts,
  dehydratedState
}: AppProps & AppOwnProps) => {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <ClientConfigProvider dehydratedState={dehydratedState}>
          <AppContent Component={Component} pageProps={pageProps} brandName={brandName} />
        </ClientConfigProvider>
      </QueryClientProvider>

      {customScripts.map((script, i) => {
        const scriptProps: ComponentProps<typeof Script> = {
          strategy: script.strategy,
          id: script.id
        };

        if ('src' in script && script.src) {
          scriptProps.src = script.src;
        }

        if ('dangerouslySetInnerHTML' in script) {
          scriptProps.dangerouslySetInnerHTML = script.dangerouslySetInnerHTML;
        }

        return <Script key={i} {...scriptProps} />;
      })}
    </>
  );
};

MyApp.getInitialProps = async (context: AppContext): Promise<AppOwnProps & AppInitialProps> => {
  const ctx = await App.getInitialProps(context);

  let brandName = '';
  let customScripts: AppOwnProps['customScripts'] = [];

  if (typeof window === 'undefined') {
    const config = Config();
    brandName = config.template.ui.brandName;
    customScripts = config.template.ui.meta.customScripts;
  }

  let dehydratedState: unknown;
  try {
    if (typeof window === 'undefined') {
      const qc = new QueryClient();
      await prefetchClientAppConfig(qc, ['client-app-config'], getClientAppConfigServer);
      dehydratedState = dehydrate(qc);
    }
  } catch (error) {
    console.error('[Client App Config] Failed to prefetch:', error);
  }

  return { ...ctx, brandName, customScripts, dehydratedState };
};

export default appWithTranslation(MyApp);
