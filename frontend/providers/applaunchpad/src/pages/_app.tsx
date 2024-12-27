import List from '@/components/ImageHub/list';
import { theme } from '@/constants/theme';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useGlobalStore } from '@/store/global';
import { SEALOS_DOMAIN, loadInitData } from '@/store/static';
import { useUserStore } from '@/store/user';
import '@/styles/reset.scss';
import { getLangStore, setLangStore } from '@/utils/cookieUtils';
import { getUserIsLogin } from '@/utils/user';
import { Box, ChakraProvider, Flex, Heading, ListItem, Text, Link, useDisclosure, background } from '@chakra-ui/react';
import '@sealos/driver/src/driver.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import throttle from 'lodash/throttle';
import { appWithTranslation, useTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Router, { useRouter } from 'next/router';
import NProgress from 'nprogress'; //nprogress module
import 'nprogress/nprogress.css';
import { useEffect, useState } from 'react';
import { EVENT_NAME } from 'sealos-desktop-sdk';
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app';

//Binding events.
Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', () => NProgress.done());

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      cacheTime: 0
    }
  }
});

const App = ({ Component, pageProps }: AppProps) => {
  const router = useRouter();
  const { i18n } = useTranslation();
  const { setScreenWidth, loading, setLastRoute, initFormSliderList } = useGlobalStore();
  const { loadUserSourcePrice } = useUserStore();
  const { Loading } = useLoading();
  const [refresh, setRefresh] = useState(false);
  const { openConfirm, ConfirmChild } = useConfirm({
    title: 'jump_prompt',
    content: 'jump_message'
  });

  const myStyles = {
    cursor: 'pointer',
  };

  useEffect(() => {
    if (!getUserIsLogin()) {
      router.push('/login');
    }
    const response = createSealosApp();
    (async () => {
      const { SEALOS_DOMAIN, FORM_SLIDER_LIST_CONFIG } = await (() => loadInitData())();
      initFormSliderList(FORM_SLIDER_LIST_CONFIG);
      loadUserSourcePrice();

      try {
        const newSession = JSON.stringify(await sealosApp.getSession());
        const oldSession = localStorage.getItem('session');
        if (newSession && newSession !== oldSession) {
          localStorage.setItem('session', newSession);
          window.location.reload();
        }
        console.log('app init success');
      } catch (err) {
        console.log('App is not running in desktop');
        // if (!process.env.NEXT_PUBLIC_MOCK_USER) {
        //   localStorage.removeItem('session');
        //   openConfirm(() => {
        //     window.open(`https://${SEALOS_DOMAIN}`, '_self');
        //   })();
        // }
      }
    })();
    return response;
  }, []);

  // add resize event
  useEffect(() => {
    const resize = throttle((e: Event) => {
      const documentWidth = document.documentElement.clientWidth || document.body.clientWidth;
      setScreenWidth(documentWidth);
    }, 200);
    window.addEventListener('resize', resize);
    const documentWidth = document.documentElement.clientWidth || document.body.clientWidth;
    setScreenWidth(documentWidth);

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [setScreenWidth]);

  useEffect(() => {
    const changeI18n = async (data: { currentLanguage: string }) => {
      const lastLang = getLangStore();
      const newLang = data.currentLanguage;
      if (lastLang !== newLang) {
        i18n?.changeLanguage?.(newLang);
        setLangStore(newLang);
        setRefresh((state) => !state);
      }
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

    return sealosApp?.addAppEventListen(EVENT_NAME.CHANGE_I18N, changeI18n);
  }, []);

  // record route
  useEffect(() => {
    return () => {
      setLastRoute(router.asPath);
    };
  }, [router.pathname]);

  useEffect(() => {
    const lang = getLangStore() || 'zh';
    i18n?.changeLanguage?.(lang);
  }, [refresh, router.pathname]);

  useEffect(() => {
    const setupInternalAppCallListener = async () => {
      try {
        const event = async (e: MessageEvent) => {
          const whitelist = [`https://${SEALOS_DOMAIN}`];
          if (!whitelist.includes(e.origin)) {
            return;
          }
          try {
            if (e.data?.type === 'InternalAppCall' && e.data?.name) {
              router.push({
                pathname: '/app/detail',
                query: {
                  name: e.data.name
                }
              });
            }
          } catch (error) {
            console.log(error, 'error');
          }
        };
        window.addEventListener('message', event);
        return () => window.removeEventListener('message', event);
      } catch (error) {}
    };
    setupInternalAppCallListener();
  }, []);

  return (
    <>
      <Head>
        <title>Sealos AppLaunchpad</title>
        <meta name="description" content="Generated by Sealos Team" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          {/* <button
            onClick={() => {
              const lastLang = getLangStore();
              let lang = lastLang === 'en' ? 'zh' : 'en';
              if (lastLang !== lang) {
                i18n.changeLanguage(lang);
                setLangStore(lang);
                setRefresh((state) => !state);
              }
            }}
          >
            changeLanguage
          </button> */}

          {/* <Route path="/login" component={Login} /> */}
          <Flex minH="100vh" direction="column">

            <Box bg="#001529" color="white" px={4} py={5}>

              <Heading size="md">储存云</Heading>

            </Box>

            <Flex flex={1}>

              <Box w="200px" bg="#001529" color="white" p={4} borderRight="1px" borderColor="gray.300">
                <Text fontSize="lg" p={4} className="menu" onClick={()=>router.push('/imagehub')}>镜像管理</Text>
                <Text fontSize="lg" p={4} className="menu" onClick={()=>router.push('/apps')}>应用管理</Text>
                <Text fontSize="lg" p={4} className="menu" onClick={()=>router.push('/tenantManage')}>租户管理</Text>
                <Text fontSize="lg" p={4} className="menu" onClick={()=>router.push('/nodeManage')}>节点管理</Text>
              </Box>

              <Box flex={1}>

                <Component {...pageProps} />

              </Box>

            </Flex>
          </Flex>
          <ConfirmChild />
          <Loading loading={loading} />
        </ChakraProvider>
      </QueryClientProvider>
    </>
  );
};

export default appWithTranslation(App);
