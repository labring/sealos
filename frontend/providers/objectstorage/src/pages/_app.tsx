import { initUser } from '@/api/bucket';
import { QueryKey } from '@/consts';
import { useOssStore } from '@/store/ossStore';
import useSessionStore from '@/store/session';
import { theme } from '@/styles/chakraTheme';
import { ChakraProvider } from '@chakra-ui/react';
import { Hydrate, QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { appWithTranslation, i18n, useTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { EVENT_NAME } from 'sealos-desktop-sdk';
import { sealosApp, createSealosApp } from 'sealos-desktop-sdk/app';
function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(
    new QueryClient({
      defaultOptions: {
        queries: {
          // With SSR, we usually want to set some default staleTime
          // above 0 to avoid refetching immediately on the client
          staleTime: 60 * 1000
        }
      }
    })
  );
  const initMinioClient = useOssStore((s) => s.initClient);
  const client = useOssStore((s) => s.client);
  // const setSession = useSessionStore((s) => s.setSession);
  const { session: oldSession, setSession } = useSessionStore();
  const clearClient = useOssStore((s) => s.clearClient);
  const router = useRouter();
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
      } catch (error) {
        // changeI18n({
        //   currentLanguage: i18n.options.missingKeyNoValueFallbackToKey
        // });
      }
    })();
    return sealosApp?.addAppEventListen(EVENT_NAME.CHANGE_I18N, changeI18n);
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        const session = await sealosApp.getSession();
        if (oldSession?.kubeconfig === session.kubeconfig && client) return;
        setSession(session);
        const userInit = await queryClient.fetchQuery([QueryKey.bucketUser, { session }], initUser);
        const accessKeyId = userInit?.secret?.CONSOLE_ACCESS_KEY;
        const secretAccessKey = userInit?.secret?.CONSOLE_SECRET_KEY;
        const external = userInit?.secret?.external;
        if (!accessKeyId || !secretAccessKey || !external) return;
        initMinioClient({
          credentials: {
            accessKeyId,
            secretAccessKey
          },
          endpoint: 'https://' + external,
          forcePathStyle: true,
          region: 'us-east-1'
        });
        await queryClient.invalidateQueries();
      } catch (error) {}
    };
    initApp();
  }, [queryClient, client]);
  return (
    <QueryClientProvider client={queryClient}>
      <Hydrate state={pageProps.dehydratedState}>
        <ChakraProvider theme={theme}>
          <Component {...pageProps} />
        </ChakraProvider>
      </Hydrate>
    </QueryClientProvider>
  );
}
export default appWithTranslation(App);
