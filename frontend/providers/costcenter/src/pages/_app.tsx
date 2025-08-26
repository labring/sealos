import '@/styles/globals.css';

import Layout from '@/layout';
import { getAppConfig } from '@/api/platform';
import { getAppList } from '@/api/billing';
import request from '@/service/request';
import { ApiResp } from '@/types/api';
import { Region } from '@/types/region';
import useAppTypeStore from '@/stores/appType';
import useBillingStore from '@/stores/billing';
import useEnvStore from '@/stores/env';
import { theme } from '@/styles/chakraTheme';
import { Hydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import Router, { useRouter } from 'next/router';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { useEffect } from 'react';
import 'react-day-picker/dist/style.css';
import { EVENT_NAME } from 'sealos-desktop-sdk';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { ChakraProvider } from '@chakra-ui/react';

// Make sure to call `loadStripe` outside a component’s render to avoid
// recreating the `Stripe` object on every render.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // retry: false,
      cacheTime: 1000 * 60
    }
  }
});

Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', () => NProgress.done());

const App = ({ Component, pageProps }: AppProps) => {
  const state = useEnvStore();
  const router = useRouter();
  const { setAppTypeMap, appTypeMap } = useAppTypeStore();
  const { setAppTypeList, setRegionList } = useBillingStore();
  // init language
  const changeI18n = (data: { currentLanguage: string }) => {
    router.replace(router.basePath, router.asPath, { locale: data.currentLanguage });
  };

  useEffect(() => {
    sealosApp.addAppEventListen(EVENT_NAME.CHANGE_I18N, changeI18n);
    return () => {
      sealosApp.removeAppEventListen(EVENT_NAME.CHANGE_I18N);
    };
  }, []);

  useEffect(() => {
    state.setEnv('i18nIsInitialized', false);
    (async () => {
      try {
        const lang = await sealosApp.getLanguage();
        changeI18n({
          currentLanguage: lang.lng
        });
        state.setEnv('i18nIsInitialized', true);
      } catch (error) {
        console.error('get language error');
        state.setEnv('i18nIsInitialized', false);
      }
    })();
  }, [router.asPath]);

  // init
  useEffect(() => {
    (async () => {
      try {
        const { data } = await getAppConfig();
        state.setEnv('realNameRechargeLimit', !!data?.REALNAME_RECHARGE_LIMIT);
        state.setEnv('invoiceEnabled', !!data?.INVOICE_ENABLED);
        state.setEnv('transferEnabled', !!data?.TRANSFER_ENABLED);
        state.setEnv('rechargeEnabled', !!data?.RECHARGE_ENABLED);
        state.setEnv('currency', data?.CURRENCY || 'shellCoin');
        state.setEnv('gpuEnabled', !!data?.GPU_ENABLED);
        const stripeE = !!data?.STRIPE_ENABLED;
        state.setEnv('stripeEnabled', stripeE);
        stripeE && state.setStripe(data?.STRIPE_PUB || '');
        state.setEnv('wechatEnabled', !!data?.WECHAT_ENABLED);
        state.setEnv('alipayEnabled', !!data?.ALIPAY_ENABLED);
      } catch (error) {
        console.error('get init config error');
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await queryClient.fetchQuery({
        queryFn: getAppList,
        queryKey: ['appList']
      });
      const record = data?.appMap;
      if (record) {
        setAppTypeMap(new Map(Object.entries(record)));
        setAppTypeList(['all_app_type', ...(Object.values(record) || [])]);
      }
    })();
  }, []);

  // Initialize regions data
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
    <QueryClientProvider client={queryClient}>
      <Hydrate state={pageProps.dehydratedState}>
        <ChakraProvider theme={theme} resetScope=".ck-reset" disableGlobalStyle>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </ChakraProvider>
      </Hydrate>
    </QueryClientProvider>
  );
};
export default appWithTranslation(App);
