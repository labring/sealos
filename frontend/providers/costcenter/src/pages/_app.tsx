import '@/styles/globals.css';

import Layout from '@/layout';
import { getAppList } from '@/api/billing';
import request from '@/service/request';
import { ApiResp } from '@/types/api';
import { Region } from '@/types/region';
import useAppTypeStore from '@/stores/appType';
import useBillingStore from '@/stores/billing';
import { theme } from '@/styles/chakraTheme';
import { dehydrate, Hydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { appWithTranslation } from 'next-i18next';
import type { AppContext, AppInitialProps, AppProps } from 'next/app';
import App from 'next/app';
import Router, { useRouter } from 'next/router';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { useEffect } from 'react';
import 'react-day-picker/dist/style.css';
import { EVENT_NAME } from 'sealos-desktop-sdk';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { ChakraProvider } from '@chakra-ui/react';
import { Toaster } from '@sealos/shadcn-ui/sonner';
import {
  ClientConfigProvider,
  prefetchClientAppConfig,
  setupClientAppConfigDefaults
} from '@sealos/shared';
import { getClientAppConfigServer } from '@/pages/api/platform/getClientAppConfig';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // retry: false,
      cacheTime: 1000 * 60
    }
  }
});

setupClientAppConfigDefaults(queryClient, ['client-app-config']);

Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', () => NProgress.done());

type AppOwnProps = { dehydratedState?: unknown };

function AppContent({ Component, pageProps }: Pick<AppProps, 'Component' | 'pageProps'>) {
  const router = useRouter();
  const { setAppTypeMap } = useAppTypeStore();
  const { setAppTypeList, setRegionList } = useBillingStore();

  const changeI18n = (data: { currentLanguage: string }) => {
    router.replace(router.basePath, router.asPath, { locale: data.currentLanguage });
  };

  useEffect(() => {
    sealosApp.addAppEventListen(EVENT_NAME.CHANGE_I18N, changeI18n);

    const handlePostMessage = ({
      data,
      source
    }: MessageEvent<{
      type: string;
      page?: string;
      mode?: string;
      stripeState?: string;
      payId?: string;
    }>) => {
      try {
        if (!source) return;
        if (data && typeof data === 'object' && data.type === 'InternalAppCall') {
          const params = new URLSearchParams();
          if (data.page) params.set('page', data.page);
          if (data.mode) params.set('mode', data.mode);
          if (data.stripeState) params.set('stripeState', data.stripeState);
          if (data.payId) params.set('payId', data.payId);

          const queryString = params.toString();
          const targetUrl = queryString ? `/?${queryString}` : '/';

          router.replace(targetUrl, undefined, { shallow: false });
        }
      } catch (error) {
        console.error('Error handling postMessage:', error);
      }
    };

    // eslint-disable-next-line
    // nosem
    window.addEventListener('message', handlePostMessage);

    return () => {
      sealosApp.removeAppEventListen(EVENT_NAME.CHANGE_I18N);
      window.removeEventListener('message', handlePostMessage);
    };
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const lang = await sealosApp.getLanguage();
        changeI18n({
          currentLanguage: lang.lng
        });
      } catch (error) {
        console.error('get language error');
      }
    })();
  }, [router.asPath]);

  useEffect(() => {
    (async () => {
      const { data } = await queryClient.fetchQuery({
        queryFn: getAppList,
        queryKey: ['appList']
      });
      const record = data?.appMap;
      if (record) {
        setAppTypeMap(new Map(Object.entries(record)));
        setAppTypeList(Object.values(record) || []);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const regionData = await queryClient.fetchQuery({
          queryFn: () => request<any, ApiResp<Region[]>>('/api/getRegions'),
          queryKey: ['regionList', 'app']
        });
        console.log('Regions loaded in app:', regionData);
        setRegionList(regionData?.data || []);
      } catch (error) {
        console.error('Failed to load regions:', error);
      }
    })();
  }, []);

  return (
    <Hydrate state={pageProps.dehydratedState}>
      <ChakraProvider theme={theme} resetScope=".ck-reset" disableGlobalStyle>
        <Layout>
          <Component {...pageProps} />
        </Layout>
        <Toaster position="top-center" />
      </ChakraProvider>
    </Hydrate>
  );
}

const MyApp = ({ Component, pageProps, dehydratedState }: AppProps & AppOwnProps) => (
  <QueryClientProvider client={queryClient}>
    <ClientConfigProvider dehydratedState={dehydratedState}>
      <AppContent Component={Component} pageProps={pageProps} />
    </ClientConfigProvider>
  </QueryClientProvider>
);

MyApp.getInitialProps = async (context: AppContext): Promise<AppOwnProps & AppInitialProps> => {
  const ctx = await App.getInitialProps(context);

  let dehydratedState: unknown;
  if (typeof window === 'undefined') {
    const qc = new QueryClient();
    await prefetchClientAppConfig(qc, ['client-app-config'], getClientAppConfigServer);
    dehydratedState = dehydrate(qc);
  }

  return { ...ctx, dehydratedState };
};

export default appWithTranslation(MyApp);
