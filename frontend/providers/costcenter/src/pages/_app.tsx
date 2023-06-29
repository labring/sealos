import Layout from '@/layout';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { EVENT_NAME } from 'sealos-desktop-sdk';
import { theme } from '@/styles/chakraTheme';
import '@/styles/globals.scss';
import { ChakraProvider } from '@chakra-ui/react';
import { persistQueryClient, removeOldestQuery } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { Hydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AppProps } from 'next/app';
import Fonts from '@/styles/fonts';
import Router from 'next/router';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import 'react-day-picker/dist/style.css';
import { appWithTranslation, i18n } from 'next-i18next';
import { useEffect } from 'react';
import { setCookie } from '@/utils/cookieUtils';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // retry: false,
      cacheTime: 1000 * 60
    }
  }
});
if (typeof window !== 'undefined') {
  const syncStoragePersister = createSyncStoragePersister({
    storage: window.localStorage,
    retry: removeOldestQuery
  });

  persistQueryClient({
    persister: syncStoragePersister,
    queryClient: queryClient
  });
}

Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', () => NProgress.done());

const App = ({ Component, pageProps }: AppProps) => {
  useEffect(() => {
    const changeI18n = (data: any) => {
      setCookie('NEXT_LOCALE', data.currentLanguage, {
        expires: 30,
        sameSite: 'None',
        secure: true
      });
      i18n?.changeLanguage(data.currentLanguage);
    };

    (async () => {
      try {
        const lang = await sealosApp.getLanguage();
        changeI18n({
          currentLanguage: lang.lng
        });
      } catch (error) {
        changeI18n('zh');
      }
    })();
    sealosApp.addAppEventListen(EVENT_NAME.CHANGE_I18N, changeI18n);
    return () => {
      sealosApp.removeAppEventListen(EVENT_NAME.CHANGE_I18N);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        <Fonts></Fonts>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </ChakraProvider>
    </QueryClientProvider>
  );
};
export default appWithTranslation(App);
