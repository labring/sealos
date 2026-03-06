import { theme } from '@/constants/theme';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useClientAppConfig } from '@/hooks/useClientAppConfig';
import { useGlobalStore } from '@/store/global';
import { useUserStore } from '@/store/user';
import { getLangStore, setLangStore } from '@/utils/cookieUtils';
import { ChakraProvider } from '@chakra-ui/react';
import { dehydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import throttle from 'lodash/throttle';
import { appWithTranslation, useTranslation } from 'next-i18next';
import type { AppContext, AppInitialProps, AppProps } from 'next/app';
import Router, { useRouter } from 'next/router';
import NProgress from 'nprogress';
import { useEffect, useState, useCallback } from 'react';
import { EVENT_NAME } from 'sealos-desktop-sdk';
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app';
import 'react-day-picker/dist/style.css';
import '@/styles/reset.scss';
import 'nprogress/nprogress.css';
import '@sealos/driver/src/driver.css';
import Head from 'next/head';
import App from 'next/app';
import Script from 'next/script';
import { GTMScript } from '@sealos/gtm';
import { InsufficientQuotaDialog, type SupportedLang } from '@sealos/shared/chakra';
import {
  ClientConfigProvider,
  prefetchClientAppConfig,
  setupClientAppConfigDefaults,
  QuotaGuardProvider
} from '@sealos/shared';
import { Config } from '@/config';
import { getClientAppConfigServer } from '@/pages/api/platform/getClientAppConfig';

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

type MetaScript = { src: string; [key: string]: string };

type AppOwnProps = {
  title: string;
  description: string;
  scripts: MetaScript[];
  gtmId: string | null;
  dehydratedState?: unknown;
};

type AppContentProps = {
  Component: AppProps['Component'];
  pageProps: AppProps['pageProps'];
  title: string;
  description: string;
};

const AppContent = ({ Component, pageProps, title, description }: AppContentProps) => {
  const router = useRouter();
  const { i18n } = useTranslation();
  const { setScreenWidth, loading, setLastRoute, initFormSliderList } = useGlobalStore();
  const { loadUserSourcePrice, setSession } = useUserStore();
  const { Loading } = useLoading();
  const [refresh, setRefresh] = useState(false);
  const { openConfirm, ConfirmChild } = useConfirm({
    title: 'jump_prompt',
    content: 'jump_message'
  });
  const config = useClientAppConfig();

  const getSession = useCallback(() => {
    return useUserStore.getState().session ?? null;
  }, []);

  useEffect(() => {
    const response = createSealosApp();
    (async () => {
      if (config.appResourceFormSliderConfig) {
        initFormSliderList(config.appResourceFormSliderConfig);
      }
      loadUserSourcePrice();

      try {
        const newSession = JSON.stringify(await sealosApp.getSession());
        setSession(JSON.parse(newSession));

        console.log('app init success');
      } catch (err) {
        console.log('App is not running in desktop');
        if (!process.env.NEXT_PUBLIC_MOCK_USER) {
          openConfirm(() => {
            window.open(`https://${config.desktopDomain}`, '_self');
          })();
        }
      }
    })();
    return response;
  }, []);

  // Clean up old Service Workers (PWA has been removed)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Unregister all Service Workers
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().then((success) => {
            if (success) {
              console.log('Service Worker unregistered');
            }
          });
        });
      });

      // Clear all caches
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name);
          });
        });
      }
    }
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

  useEffect(() => {
    const changeI18n = async (data: { currentLanguage: string }) => {
      const lastLang = getLangStore();
      const newLang = data.currentLanguage;
      if (lastLang !== newLang) {
        i18n?.changeLanguage?.(newLang);
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
          currentLanguage: 'zh'
        });
      }
    })();

    return sealosApp?.addAppEventListen(EVENT_NAME.CHANGE_I18N, changeI18n);
  }, []);

  // record route
  useEffect(() => {
    return () => {
      const currentPath = router.asPath;
      if (router.isReady && !currentPath.includes('/redirect')) {
        setLastRoute(currentPath);
      }
    };
  }, [router.pathname, router.isReady, setLastRoute]);

  useEffect(() => {
    const lang = getLangStore() || 'zh';
    i18n?.changeLanguage?.(lang);
  }, [refresh, router.pathname]);

  useEffect(() => {
    const setupInternalAppCallListener = async () => {
      try {
        const event = async (
          e: MessageEvent<{
            type?: string;
            name?: string;
            formData?: string;
            action?: string;
          }>
        ) => {
          const whitelist = [`https://${config.desktopDomain}`];
          if (!whitelist.includes(e.origin)) {
            return;
          }
          try {
            if (e.data?.type === 'InternalAppCall') {
              const { name, formData, action } = e.data;
              if (formData) {
                router.replace({
                  pathname: '/redirect',
                  query: { formData }
                });
              } else if (name) {
                router.replace({
                  pathname: '/app/detail',
                  query: { name }
                });
              } else if (action) {
                router.replace({
                  pathname: '/redirect',
                  query: { action }
                });
              }
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
      {title && (
        <Head>
          <title>{title}</title>
          <meta name="description" content={description} />
        </Head>
      )}
      <ChakraProvider theme={theme}>
        <QuotaGuardProvider getSession={getSession} sealosApp={sealosApp}>
          <Component {...pageProps} />
          <InsufficientQuotaDialog lang={(i18n?.language || 'en') as SupportedLang} />
          <ConfirmChild />
          <Loading loading={loading} />
        </QuotaGuardProvider>
      </ChakraProvider>
    </>
  );
};

const MyApp = ({
  Component,
  pageProps,
  title,
  description,
  scripts,
  gtmId,
  dehydratedState
}: AppProps & AppOwnProps) => (
  <>
    <QueryClientProvider client={queryClient}>
      <ClientConfigProvider dehydratedState={dehydratedState}>
        <AppContent
          Component={Component}
          pageProps={pageProps}
          title={title}
          description={description}
        />
      </ClientConfigProvider>
    </QueryClientProvider>
    {scripts?.map((script, i) => (
      <Script key={i} {...script} />
    ))}
    <GTMScript enabled={!!gtmId} gtmId={gtmId!} debug={process.env.NODE_ENV === 'development'} />
  </>
);

MyApp.getInitialProps = async (context: AppContext): Promise<AppOwnProps & AppInitialProps> => {
  const ctx = await App.getInitialProps(context);

  let title = '';
  let description = '';
  let scripts: MetaScript[] = [];
  let gtmId: string | null = null;

  try {
    if (typeof window === 'undefined') {
      const config = Config();
      title = config.launchpad.meta.title;
      description = config.launchpad.meta.description;
      scripts = config.launchpad.meta.scripts as MetaScript[];
      gtmId = config.launchpad.gtmId;
    }
  } catch (error) {
    console.error('Failed to load config:', error);
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

  return { ...ctx, title, description, scripts, gtmId, dehydratedState };
};

export default appWithTranslation(MyApp);
