import { useConfigStore } from '@/stores/config';
import { theme } from '@/styles/chakraTheme';
import { getCookie } from '@/utils/cookieUtils';
import { ChakraProvider } from '@chakra-ui/react';
import { Hydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { appWithTranslation, useTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import Router, { useRouter } from 'next/router';
import { useEffect } from 'react';
import { GTMScript } from '@sealos/gtm';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import '@sealos/driver/src/driver.css';
import '@/styles/globals.css';
import { useJoinDiscordPromptStore } from '@/stores/joinDiscordPrompt';
import useAppStore, { BRAIN_APP_KEY, SESSION_RESTORE_APP_KEY } from '@/stores/app';
import useSessionStore from '@/stores/session';
import { useLanguageSwitcher } from '@/hooks/useLanguageSwitcher';

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

  const router = useRouter();

  const { initAppConfig, layoutConfig } = useConfigStore();
  const { autolaunch, currentAppKey } = useAppStore();
  const joinDiscordPromptStore = useJoinDiscordPromptStore();
  useLanguageSwitcher();

  useEffect(() => {
    // Block discord prompt under certain circumstances.
    if (Object.hasOwn(router.query, 'openapp') || autolaunch) {
      joinDiscordPromptStore.blockAutoOpen();
      return;
    }

    // Block discord prompt when restoring system-brain app
    if (typeof window !== 'undefined') {
      const sessionRestoreKey = sessionStorage.getItem(SESSION_RESTORE_APP_KEY);
      if (sessionRestoreKey === BRAIN_APP_KEY || currentAppKey === BRAIN_APP_KEY) {
        joinDiscordPromptStore.blockAutoOpen();
      }
    }
  }, [router.query, joinDiscordPromptStore, autolaunch, currentAppKey]);

  useEffect(() => {
    initAppConfig();
  }, []);

  // Clean up old Service Workers (PWA has been removed)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Unregister all Service Workers
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().then((success) => {
            if (success) {
              console.log('Service Worker unregistered');
            }
          });
        });
      });

      // Clear all caches
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name);
          });
        });
      }
    }
  }, []);

  useEffect(() => {
    const lang = getCookie('NEXT_LOCALE');
    i18n?.changeLanguage?.(lang);
  }, [i18n]);

  // Record user's last activity time when leaving the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const { isUserLogin, token } = useSessionStore.getState();
        if (isUserLogin() && token) {
          // Use sendBeacon to ensure the request is sent even when the page is unloading
          // Put token in query params since sendBeacon cannot set custom headers
          const url = `/api/account/updateActivity?token=${encodeURIComponent(token)}`;
          navigator.sendBeacon(url, JSON.stringify({}));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GTMScript
        enabled={!!layoutConfig?.gtmId}
        gtmId={layoutConfig?.gtmId ?? ''}
        debug={process.env.NODE_ENV === 'development'}
      />
      <Hydrate state={pageProps.dehydratedState}>
        <ChakraProvider theme={theme} resetScope=".ck-reset" disableGlobalStyle>
          <Component {...pageProps} />
        </ChakraProvider>
      </Hydrate>
    </QueryClientProvider>
  );
};

export default appWithTranslation(App);
