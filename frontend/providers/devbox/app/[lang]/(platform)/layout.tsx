'use client';

import throttle from 'lodash/throttle';
import { useEffect, useState } from 'react';
import { EVENT_NAME } from 'sealos-desktop-sdk';
import { usePathname, useRouter } from '@/i18n';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { createSealosApp, sealosApp } from 'sealos-desktop-sdk/app';

import { initUser } from '@/api/template';
import { useEnvStore } from '@/stores/env';
import { useUserStore } from '@/stores/user';
import { useConfirm } from '@/hooks/useConfirm';
import { usePriceStore } from '@/stores/price';
import { useGlobalStore } from '@/stores/global';
import { getLangStore, setLangStore } from '@/utils/cookie';
import { cleanSession, setSessionToSessionStorage } from '@/utils/user';

import { Toaster } from '@/components/ui/sonner';
import RouteHandlerProvider from '@/components/providers/MyRouteHandlerProvider';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openConfirm, ConfirmChild } = useConfirm({
    title: 'jump_prompt',
    content: 'not_allow_standalone_use'
  });
  const queryClient = useQueryClient();

  const { setEnv, env } = useEnvStore();
  const { loadUserDebt } = useUserStore();
  const { setSourcePrice } = usePriceStore();
  const { setScreenWidth, setLastRoute } = useGlobalStore();

  const [init, setInit] = useState(false);
  const [refresh, setRefresh] = useState(false);
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
    loadUserDebt();
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
          // currentLanguage: 'zh'
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
    <RouteHandlerProvider>
      <ConfirmChild />
      <Toaster />
      {children}
    </RouteHandlerProvider>
  );
}
