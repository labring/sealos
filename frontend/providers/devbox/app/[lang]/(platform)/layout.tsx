'use client';

import { usePathname, useRouter } from '@/i18n';
import throttle from 'lodash/throttle';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EVENT_NAME } from 'sealos-desktop-sdk';
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app';

// import { useConfirm } from '@/hooks/useConfirm'
import { useLoading } from '@/hooks/useLoading';

import { useEnvStore } from '@/stores/env';
import { useGlobalStore } from '@/stores/global';
import { usePriceStore } from '@/stores/price';

import { initUser } from '@/api/template';
import ChakraProvider from '@/components/providers/MyChakraProvider';
import RouteHandlerProvider from '@/components/providers/MyRouteHandlerProvider';
import { useConfirm } from '@/hooks/useConfirm';
import { getLangStore, setLangStore } from '@/utils/cookie';
import { cleanSession, setSessionToSessionStorage } from '@/utils/user';
import { useQueryClient } from '@tanstack/react-query';
import TemplateModal from './template/TemplateModal';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { Loading } = useLoading();
  const { setEnv, env } = useEnvStore();
  const searchParams = useSearchParams();
  const { setSourcePrice } = usePriceStore();
  const [refresh, setRefresh] = useState(false);
  const { setScreenWidth, loading, setLastRoute } = useGlobalStore();
  const { openConfirm, ConfirmChild } = useConfirm({
    title: 'jump_prompt',
    content: 'not_allow_standalone_use'
  });
  const queryClient = useQueryClient();
  const [init, setInit] = useState(false);
  // init session
  useEffect(() => {
    const response = createSealosApp();
    (async () => {
      try {
        const newSession = JSON.stringify(await sealosApp.getSession());
        const oldSession = sessionStorage.getItem('session');
        if (newSession && newSession !== oldSession) {
          sessionStorage.setItem('session', newSession);
          return window.location.reload();
        }
        // init user
        console.log('devbox: app init success');
        const token = await initUser();
        if (!!token) {
          setSessionToSessionStorage(token);
          setInit(true);
        }
        queryClient.clear();
      } catch (err) {
        console.log('devbox: app is not running in desktop');
        if (!process.env.NEXT_PUBLIC_MOCK_USER) {
          cleanSession();
          openConfirm(() => {
            window.open(`https://${env.sealosDomain}`, '_self');
          })();
        }
      }
    })();
    return response;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!init) return;
    setSourcePrice();
    // setRuntime()
    setEnv();
    const changeI18n = async (data: any) => {
      const lastLang = getLangStore();
      const newLang = data.currentLanguage;
      if (lastLang !== newLang) {
        router.push(pathname, { locale: newLang });
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
          currentLanguage: 'en'
        });
      }
    })();

    return sealosApp?.addAppEventListen(EVENT_NAME.CHANGE_I18N, changeI18n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [init]);

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

  // record route
  useEffect(() => {
    return () => {
      setLastRoute(pathname);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const lang = getLangStore() || 'zh';
    router.push(pathname, { locale: lang });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, pathname]);

  useEffect(() => {
    const page = searchParams.get('page');
    const runtime = searchParams.get('runtime');

    const path = `${page ? `/devbox/${page}` : ''}${runtime ? `?runtime=${runtime}` : ''}`;

    router.push(path);
  }, [router, searchParams]);

  return (
    <ChakraProvider>
      <RouteHandlerProvider>
        <ConfirmChild />
        <Loading loading={loading} />
        {children}
        <TemplateModal />
      </RouteHandlerProvider>
    </ChakraProvider>
  );
}
