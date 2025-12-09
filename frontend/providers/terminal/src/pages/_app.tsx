import '@/styles/globals.scss';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AppProps } from 'next/app';
import { InsufficientQuotaDialog, type SupportedLang } from '@sealos/shared/chakra';
import { createQuotaGuarded } from '@sealos/shared';
import useSessionStore from '@/store/session';
import { useRouter } from 'next/router';

createQuotaGuarded({
  getSession: () => useSessionStore.getState().session
});

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

  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>
        <Component {...pageProps} />
        <InsufficientQuotaDialog lang={(router.locale || 'en') as SupportedLang} />
      </ChakraProvider>
    </QueryClientProvider>
  );
}
