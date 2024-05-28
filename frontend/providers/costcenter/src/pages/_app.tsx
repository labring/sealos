import Layout from '@/layout';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { EVENT_NAME } from 'sealos-desktop-sdk';
import '@/styles/globals.scss';
import { theme } from '@/styles/chakraTheme';
import { ChakraProvider } from '@chakra-ui/react';
import { Hydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AppProps } from 'next/app';
import Router, { useRouter } from 'next/router';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import 'react-day-picker/dist/style.css';
import { appWithTranslation, i18n } from 'next-i18next';
import { useEffect } from 'react';
import request from '@/service/request';
import { ApiResp } from '@/types/api';
import { Response as initDataRes } from '@/pages/api/platform/getAppConfig';
import useEnvStore from '@/stores/env';

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
  useEffect(() => {
    const changeI18n = (data: { currentLanguage: string }) => {
      router.replace(router.basePath, router.asPath, { locale: data.currentLanguage });
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

    (async () => {
      try {
        const { data } = await request<any, ApiResp<initDataRes>>('/api/platform/getAppConfig');
        state.setEnv('invoiceEnabled', !!data?.INVOICE_ENABLED);
        state.setEnv('transferEnabled', !!data?.TRANSFER_ENABLED);
        state.setEnv('rechargeEnabled', !!data?.RECHARGE_ENABLED);
        state.setEnv('currency', data?.CURRENCY || 'shellCoin');
        state.setEnv('gpuEnabled', !!data?.GPU_ENABLED);
        const stripeE = !!data?.STRIPE_ENABLED;
        state.setEnv('stripeEnabled', stripeE);
        stripeE && state.setStripe(data?.STRIPE_PUB || '');
        state.setEnv('wechatEnabled', !!data?.WECHAT_ENABLED);
      } catch (error) {
        console.error('get init config error');
      }
    })();
    sealosApp.addAppEventListen(EVENT_NAME.CHANGE_I18N, changeI18n);
    return () => {
      sealosApp.removeAppEventListen(EVENT_NAME.CHANGE_I18N);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Hydrate state={pageProps.dehydratedState}>
        <ChakraProvider theme={theme}>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </ChakraProvider>
      </Hydrate>
    </QueryClientProvider>
  );
};
export default appWithTranslation(App);
