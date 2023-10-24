import request from '@/services/request';
import { useGlobalStore } from '@/stores/global';
import { theme } from '@/styles/chakraTheme';
import '@/styles/globals.scss';
import { ApiResp, SystemEnv } from '@/types';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import Router from 'next/router';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // refetchOnWindowFocus: false,
      retry: false
      // cacheTime: 0
    }
  }
});

//Binding events.
Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', () => NProgress.done());

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        <Component {...pageProps} />
      </ChakraProvider>
    </QueryClientProvider>
  );
};
export default appWithTranslation(App);
