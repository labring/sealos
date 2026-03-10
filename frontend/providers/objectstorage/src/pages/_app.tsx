import { initUser } from '@/api/bucket';
import { QueryKey } from '@/consts';
import { useOssStore } from '@/store/ossStore';
import useSessionStore from '@/store/session';
import { theme } from '@/styles/chakraTheme';
import { useClientAppConfig } from '@/hooks/useClientAppConfig';
import { ChakraProvider } from '@chakra-ui/react';
import { dehydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { appWithTranslation } from 'next-i18next';
import NextApp, { AppContext, AppInitialProps, type AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect, useCallback } from 'react';
import { EVENT_NAME } from 'sealos-desktop-sdk';
import { sealosApp, createSealosApp } from 'sealos-desktop-sdk/app';
import {
  ClientConfigProvider,
  InsufficientQuotaDialog,
  prefetchClientAppConfig,
  QuotaGuardProvider,
  setupClientAppConfigDefaults,
  type SupportedLang
} from '@sealos/shared';
import { getClientAppConfigServer } from '@/pages/api/platform/getClientAppConfig';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      cacheTime: 0
    }
  }
});

setupClientAppConfigDefaults(queryClient, ['client-app-config']);

type AppOwnProps = {
  dehydratedState?: unknown;
};

function AppContent({ Component, pageProps }: AppProps) {
  useClientAppConfig();

  const initMinioClient = useOssStore((s) => s.initClient);
  const { setSession } = useSessionStore();
  const { clearClient, setSecret, secret } = useOssStore((s) => s);
  const router = useRouter();

  const getSession = useCallback(() => {
    return useSessionStore.getState().session ?? null;
  }, []);

  useEffect(() => {
    createSealosApp();
  }, []);

  useEffect(() => {
    const changeI18n = async (data: any) => {
      const locale = data.currentLanguage;
      router.replace(router.basePath, router.asPath, { locale });
    };
    (async () => {
      try {
        const lang = await sealosApp.getLanguage();
        await changeI18n({
          currentLanguage: lang.lng
        });
      } catch (error) {}
    })();
    return sealosApp?.addAppEventListen(EVENT_NAME.CHANGE_I18N, changeI18n);
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        const session = await sealosApp.getSession();
        setSession(session);
        const userInit = await queryClient.fetchQuery([QueryKey.bucketUser, { session }], initUser);
        userInit?.secret && setSecret(userInit.secret);
      } catch (error) {}
    };
    initApp();
  }, []);

  useEffect(() => {
    const initClient = async () => {
      if (secret) {
        const accessKeyId = secret.CONSOLE_ACCESS_KEY;
        const secretAccessKey = secret.CONSOLE_SECRET_KEY;
        const external = secret.external;
        if (!accessKeyId || !secretAccessKey || !external) return;
        if (secret.specVersion > secret.version) {
          return;
        }
        initMinioClient({
          credentials: {
            accessKeyId,
            secretAccessKey
          },
          endpoint: 'https://' + external,
          forcePathStyle: true,
          region: 'us-east-1'
        });
        queryClient.invalidateQueries({ queryKey: [QueryKey.bucketList] });
        queryClient.invalidateQueries({ queryKey: [QueryKey.bucketInfo] });
        queryClient.invalidateQueries({ queryKey: [QueryKey.minioFileList] });
        queryClient.invalidateQueries({ queryKey: [QueryKey.HostStatus] });
      } else {
        clearClient();
      }
    };
    initClient();
  }, [secret]);

  return (
    <ChakraProvider theme={theme}>
      <QuotaGuardProvider getSession={getSession} sealosApp={sealosApp}>
        <Component {...pageProps} />
        <InsufficientQuotaDialog lang={(router.locale || 'en') as SupportedLang} />
      </QuotaGuardProvider>
    </ChakraProvider>
  );
}

function MyApp({ Component, pageProps, dehydratedState }: AppProps & AppOwnProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ClientConfigProvider dehydratedState={dehydratedState}>
        <AppContent Component={Component} pageProps={pageProps} />
      </ClientConfigProvider>
    </QueryClientProvider>
  );
}

MyApp.getInitialProps = async (context: AppContext): Promise<AppInitialProps & AppOwnProps> => {
  const ctx = await NextApp.getInitialProps(context);
  let dehydratedState: unknown;
  try {
    if (typeof window === 'undefined') {
      const qc = new QueryClient();
      await prefetchClientAppConfig(qc, ['client-app-config'], getClientAppConfigServer);
      dehydratedState = dehydrate(qc);
    }
  } catch (error) {
    console.error('[Client App Config] Failed to prefetch:', error);
  }
  return { ...ctx, dehydratedState };
};

export default appWithTranslation(MyApp);
