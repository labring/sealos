import List from '@/components/ImageHub/list';
import { theme } from '@/constants/theme';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useGlobalStore } from '@/store/global';
import { SEALOS_DOMAIN, loadInitData } from '@/store/static';
import { useUserStore } from '@/store/user';
import '@/styles/reset.scss';
import { getLangStore, setLangStore } from '@/utils/cookieUtils';
import { getMenuList, getUserIsLogin } from '@/utils/user';
import { Box, ChakraProvider, Flex, Heading, ListItem, Text, Link, useDisclosure, background, Button } from '@chakra-ui/react';
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
import Login from './login';
import { setUserIsLogin } from '@/utils/user';
import { getParamValue } from '@/utils/tools'

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
  const [showMenu, setShowMenu] = useState(false)
  const { openConfirm, ConfirmChild } = useConfirm({
    title: 'jump_prompt',
    content: 'jump_message'
  });
  const [loginStatus, setLoginStatus] = useState(true);

  const myStyles = {
    cursor: 'pointer',
  };
  const menuList:any[] = getMenuList()

  useEffect(() => {
    const isLogin = getUserIsLogin();
    const showMenu = getParamValue('showMenu')
    setLoginStatus(isLogin)
    if (!isLogin) {
      if(showMenu){
        router.push('/login?showMenu=true');
      }else{
        router.push('/login');
      }
    }
    const response = createSealosApp();
    (async () => {
      const { SEALOS_DOMAIN, FORM_SLIDER_LIST_CONFIG } = await (() => loadInitData())();
      initFormSliderList(FORM_SLIDER_LIST_CONFIG);
      loadUserSourcePrice();

      // try {
      //   const newSession = JSON.stringify(await sealosApp.getSession());
      //   const oldSession = localStorage.getItem('session');
      //   if (newSession && newSession !== oldSession) {
      //     localStorage.setItem('session', newSession);
      //     window.location.reload();
      //   }
      //   console.log('app init success');
      // } catch (err) {
      //   console.log('App is not running in desktop');
      //   // if (!process.env.NEXT_PUBLIC_MOCK_USER) {
      //   //   localStorage.removeItem('session');
      //   //   openConfirm(() => {
      //   //     window.open(`https://${SEALOS_DOMAIN}`, '_self');
      //   //   })();
      //   // }
      // }
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

  const [currentRoute, setCurrentRoute] = useState<string>('');
  useEffect(() => {
    setCurrentRoute(router.pathname)
    const showMenu = getParamValue('showMenu')
    setShowMenu(!!showMenu)
  }, [router.pathname]);


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
      } catch (error) { }
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
            {
              showMenu ?
                <Box bg="#001529" color="white" px={4} py={5} display={'flex'} justifyContent={'space-between'} alignItems={'center'}>

                  <Heading size="md">容器云</Heading>

                  {loginStatus ?
                    <Button
                      size={'sm'}
                      ml={'12px'}
                      variant={'outline'}
                      onClick={() => {
                        setUserIsLogin(false, '');
                        if(showMenu){
                           router.replace('/login?showMenu=true');
                        }else{
                           router.replace('/login');
                        }
                      }}
                    >
                      登出
                    </Button> : null}

                </Box>
                : null
            }
            <Flex flex={1}>
              {
                loginStatus ?
                  <>
                    {
                      showMenu ?
                        <Box w="200px" bg="#001529" color="white" p={4} borderRight="1px" borderColor="gray.300">
                          {menuList?.map((menu)=>{
                            return <Text fontSize="lg" p={4} className="menu" style={{ color: currentRoute === menu.path ? '#02A7F0' : '#FFFFFF' }} onClick={() => router.push(`${menu.path}${showMenu ? '?showMenu=true' : ''}`)}>{menu.name}</Text>
                          })}
                          {/* <Text fontSize="lg" p={4} className="menu" style={{ color: currentRoute === '/apps' ? '#02A7F0' : '#FFFFFF' }} onClick={() => router.push(`/apps${showMenu ? '?showMenu=true' : ''}`)}>应用管理</Text> */}
                          {/* <Text fontSize="lg" p={4} className="menu" style={{color: currentRoute === '/tenantManage' ? '#02A7F0' : '#FFFFFF'}} onClick={()=>router.push('/tenantManage')}>租户管理</Text> */}
                          {/* <Text fontSize="lg" p={4} className="menu" style={{ color: currentRoute === '/nodeManage' ? '#02A7F0' : '#FFFFFF' }} onClick={() => router.push(`/nodeManage${showMenu ? '?showMenu=true' : ''}`)}>节点管理</Text>
                          <Text fontSize="lg" p={4} className="menu" style={{ color: currentRoute === '/user' ? '#02A7F0' : '#FFFFFF' }} onClick={() => router.push(`/user${showMenu ? '?showMenu=true' : ''}`)}>租户管理</Text>
                          <Text fontSize="lg" p={4} className="menu" style={{ color: currentRoute === '/computePower' ? '#02A7F0' : '#FFFFFF' }} onClick={() => router.push(`/computePower${showMenu ? '?showMenu=true' : ''}`)}>算力测算</Text>
                          <Text fontSize="lg" p={4} className="menu" style={{ color: currentRoute === '/monitor' ? '#02A7F0' : '#FFFFFF' }} onClick={() => router.push(`/monitor${showMenu ? '?showMenu=true' : ''}`)}>监控管理</Text>
                          <Text fontSize="lg" p={4} className="menu" style={{ color: currentRoute === '/roles' ? '#02A7F0' : '#FFFFFF' }} onClick={() => router.push(`/roles${showMenu ? '?showMenu=true' : ''}`)}>角色管理</Text>
                          <Text fontSize="lg" p={4} className="menu" style={{ color: currentRoute === '/warn' ? '#02A7F0' : '#FFFFFF' }} onClick={() => router.push(`/alert${showMenu ? '?showMenu=true' : ''}`)}>告警管理</Text>
                          <Text fontSize="lg" p={4} className="menu" style={{ color: currentRoute === '/configManage' ? '#02A7F0' : '#FFFFFF' }} onClick={() => router.push(`/configManage${showMenu ? '?showMenu=true' : ''}`)}>配置管理</Text> */}
                        </Box> : null
                    }

                    <Box flex={1}>

                      <Component {...pageProps} />

                    </Box>
                  </> : <Login></Login>
              }
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
