import '@/styles/globals.scss';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AppProps } from 'next/app';
import { InsufficientQuotaDialog, type SupportedLang } from '@sealos/shared/chakra';
import { QuotaGuardProvider } from '@sealos/shared';
import useSessionStore from '@/store/session';
import { useRouter } from 'next/router';
import { useEffect, useCallback } from 'react';
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      cacheTime: 0
    }
  }
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { setSession } = useSessionStore();

  // Create stable getSession function for QuotaGuardProvider
  const getSession = useCallback(() => {
    return useSessionStore.getState().session ?? null;
  }, []);

  useEffect(() => {
    const response = createSealosApp();
    (async () => {
      try {
        const result = await sealosApp.getSession();
        setSession(result);
        console.log('app init success');
      } catch (error) {
        console.log('App is not running in desktop');
      }
    })();
    return response;
  }, [setSession]);

  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>
        <QuotaGuardProvider getSession={getSession} sealosApp={sealosApp}>
          <Component {...pageProps} />
          <InsufficientQuotaDialog lang={(router.locale || 'en') as SupportedLang} />
        </QuotaGuardProvider>
      </ChakraProvider>
    </QueryClientProvider>
  );
}
