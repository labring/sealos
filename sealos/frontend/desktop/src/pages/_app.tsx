import { useConfigStore } from '@/stores/config';
import { theme } from '@/styles/chakraTheme';
import { getCookie } from '@/utils/cookieUtils';
import { ChakraProvider } from '@chakra-ui/react';
import { Hydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { appWithTranslation, useTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import Router from 'next/router';
import { useEffect } from 'react';
import { GTMScript } from '@sealos/gtm';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import '@sealos/driver/src/driver.css';
import '@/styles/globals.scss';
import { useAppsRunningPromptStore } from '@/stores/appsRunningPrompt';

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
  const { initAppConfig, layoutConfig } = useConfigStore();
  const { setBlockingPageUnload } = useAppsRunningPromptStore();

  useEffect(() => {
    // Reset blocking status when opening desktop
    setBlockingPageUnload(true);
  }, []);

  useEffect(() => {
    initAppConfig();
  }, []);

  useEffect(() => {
    const lang = getCookie('NEXT_LOCALE');
    i18n?.changeLanguage?.(lang);
  }, [i18n]);

  return (
    <QueryClientProvider client={queryClient}>
      <GTMScript
        enabled={!!layoutConfig?.gtmId}
        gtmId={layoutConfig?.gtmId ?? ''}
        debug={process.env.NODE_ENV === 'development'}
      />
      <Hydrate state={pageProps.dehydratedState}>
        <ChakraProvider theme={theme}>
          <Component {...pageProps} />
        </ChakraProvider>
      </Hydrate>
    </QueryClientProvider>
  );
};

export default appWithTranslation(App);
