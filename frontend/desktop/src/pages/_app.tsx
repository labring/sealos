import { theme } from '@/styles/chakraTheme';
import '@/styles/globals.scss';
import { getCookie } from '@/utils/cookieUtils';
import { ChakraProvider } from '@chakra-ui/react';
import '@sealos/driver/src/driver.css';
import { Hydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { appWithTranslation, useTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Router from 'next/router';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { useEffect } from 'react';
import { configObj } from '@/stores/syncConfig';
import Script from 'next/script';
import { MetaScriptType } from '@/types';
import { useConfigStore } from '@/stores/config';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false
    }
  }
});

//Binding events.
Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', () => NProgress.done());

const App = ({ Component, pageProps }: AppProps) => {
  const { i18n } = useTranslation();
  const { initAppConfig } = useConfigStore();

  useEffect(() => {
    initAppConfig();
  }, []);

  useEffect(() => {
    const lang = getCookie('NEXT_LOCALE');
    i18n?.changeLanguage?.(lang);
  }, [i18n]);

  const thirdPartyScripts: MetaScriptType[] = configObj.layout.meta.scripts ?? [];

  return (
    <>
      <Head>
        <title>{configObj.layout.meta.title}</title>
        <meta name="description" content={configObj.layout.meta.description} />
        <link rel="shortcut icon" href={configObj.layout.logo ?? '/favicon.ico'} />
        <link rel="icon" href={configObj.layout.logo ?? '/favicon.ico'} />
      </Head>
      <QueryClientProvider client={queryClient}>
        <Hydrate state={pageProps.dehydratedState}>
          <ChakraProvider theme={theme}>
            <Component {...pageProps} />
            {thirdPartyScripts.map((item, i) => {
              return <Script key={i} {...item} />;
            })}
          </ChakraProvider>
        </Hydrate>
      </QueryClientProvider>
    </>
  );
};

export default appWithTranslation(App);
