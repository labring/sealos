import { theme } from '@/constants/theme';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useGlobalStore } from '@/store/global';
import { DESKTOP_DOMAIN, loadInitData } from '@/store/static';
import { useUserStore } from '@/store/user';
import { getLangStore, setLangStore } from '@/utils/cookieUtils';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import throttle from 'lodash/throttle';
import { appWithTranslation, useTranslation } from 'next-i18next';
import type { AppContext, AppInitialProps, AppProps } from 'next/app';
import Router, { useRouter } from 'next/router';
import NProgress from 'nprogress';
import { useEffect, useState } from 'react';
import { EVENT_NAME } from 'sealos-desktop-sdk';
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app';
import 'react-day-picker/dist/style.css';
import '@/styles/reset.scss';
import 'nprogress/nprogress.css';
import '@sealos/driver/src/driver.css';
import Head from 'next/head';
import App from 'next/app';
const fs = require('fs');
import * as yaml from 'js-yaml';
import type { AppConfigType } from '@/types';
import Script from 'next/script';
import { GTMScript } from '@sealos/gtm';

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

type AppOwnProps = { config: Partial<AppConfigType> };

const MyApp = ({ Component, pageProps, config }: AppProps & AppOwnProps) => {
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

  useEffect(() => {
    const response = createSealosApp();
    (async () => {
      const { FORM_SLIDER_LIST_CONFIG, DESKTOP_DOMAIN } = await (() => loadInitData())();
      initFormSliderList(FORM_SLIDER_LIST_CONFIG);
      loadUserSourcePrice();

      try {
        const newSession = JSON.stringify(await sealosApp.getSession());
        setSession(JSON.parse(newSession));

        console.log('app init success');
      } catch (err) {
        console.log('App is not running in desktop');
        if (!process.env.NEXT_PUBLIC_MOCK_USER) {
          openConfirm(() => {
            window.open(`https://${DESKTOP_DOMAIN}`, '_self');
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
          const whitelist = [`https://${DESKTOP_DOMAIN}`];
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
      {config?.launchpad?.meta?.title && (
        <Head>
          <title>{config?.launchpad?.meta?.title}</title>
          <meta name="description" content={config?.launchpad?.meta?.description} />
        </Head>
      )}
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <Component {...pageProps} />
          <ConfirmChild />
          <Loading loading={loading} />
        </ChakraProvider>
      </QueryClientProvider>
      {config?.launchpad?.meta?.scripts?.map((script, i) => (
        <Script key={i} {...script} />
      ))}
      <GTMScript
        enabled={!!config?.launchpad?.gtmId}
        gtmId={config?.launchpad?.gtmId!}
        debug={process.env.NODE_ENV === 'development'}
      />
    </>
  );
};

MyApp.getInitialProps = async (context: AppContext): Promise<AppOwnProps & AppInitialProps> => {
  const ctx = await App.getInitialProps(context);
  const filename =
    process.env.NODE_ENV === 'development' ? 'data/config.yaml.local' : '/app/data/config.yaml';

  let config: Partial<AppConfigType> = {};

  try {
    if (typeof window === 'undefined') {
      const yamlContent = fs.readFileSync(filename, 'utf-8');
      config = yaml.load(yamlContent) as AppConfigType;
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }

  return { ...ctx, config };
};

export default appWithTranslation(MyApp);
