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
import { appWithTranslation } from 'next-i18next';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      cacheTime: 0
    }
  }
});

function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { setSession } = useSessionStore();

  // Create stable getSession function for QuotaGuardProvider
  const getSession = useCallback(() => {
    return useSessionStore.getState().session ?? null;
  }, []);

  const normalizeExecMessage = useCallback((raw: any) => {
    const isObject = (v: any): v is Record<string, any> =>
      !!v && typeof v === 'object' && !Array.isArray(v);

    const getString = (v: any): string | undefined =>
      typeof v === 'string' && v.length > 0 ? v : undefined;

    const getStringArray = (v: any): string[] | undefined => {
      if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v;
      return undefined;
    };

    if (!isObject(raw)) return null;

    const parseExecPayload = (payload: any) => {
      if (!isObject(payload)) return null;
      const ns = getString(payload.ns) ?? getString(payload.namespace);
      const pod = getString(payload.pod);
      if (!ns || !pod) return null;
      const container = getString(payload.container);
      const commandArr = getStringArray(payload.command);
      const commandStr = getString(payload.command);
      const command = commandArr ?? (commandStr ? [commandStr] : undefined);
      return { ns, pod, container, command };
    };

    // 1) Desktop postMessage style (used by costcenter and others)
    // Sometimes desktop forwards messageData ONLY when app is already open:
    // { type: 'InternalAppCall', ns, pod, container, command }
    try {
      if (getString((raw as any).type) === 'InternalAppCall') {
        const direct = parseExecPayload(raw);
        if (direct) return direct;
      }
    } catch {
      // ignore and fall through
    }

    // 2) Desktop postMessage style (costcenter)
    // { type: 'InternalAppCall', pathname:'/exec', query:{...}, messageData:{...} }
    try {
      if (getString((raw as any).type) === 'InternalAppCall') {
        const pathname = getString((raw as any).pathname) ?? '';
        if (pathname === '/exec' || pathname.startsWith('/exec?')) {
          const merged = {
            ...(isObject((raw as any).query) ? (raw as any).query : {}),
            ...(isObject((raw as any).messageData) ? (raw as any).messageData : {})
          };
          return parseExecPayload(merged);
        }
      }
    } catch {
      // ignore and fall through
    }

    // 3) Desktop "openDesktopApp" event-bus reply/notify shape
    // { apiName:'event-bus', data:{ eventName:'openDesktopApp', eventData:{ pathname:'/exec', query:{...}, messageData:{...}}}}
    try {
      const apiName = getString((raw as any).apiName);
      const eventName = getString((raw as any).data?.eventName);
      if (apiName === 'event-bus' && eventName === 'openDesktopApp') {
        const eventData = (raw as any).data?.eventData;
        const pathname = getString(eventData?.pathname) ?? '';
        if (pathname === '/exec' || pathname.startsWith('/exec?')) {
          const merged = {
            ...(isObject(eventData?.query) ? eventData.query : {}),
            ...(isObject(eventData?.messageData) ? eventData.messageData : {})
          };
          return parseExecPayload(merged);
        }
      }
    } catch {
      // ignore and fall through
    }

    // 4) Direct openDesktopApp eventData (some masters forward only eventData)
    // { pathname:'/exec', query:{...}, messageData:{...} }
    try {
      const pathname = getString((raw as any).pathname) ?? '';
      if (pathname === '/exec' || pathname.startsWith('/exec?')) {
        const merged = {
          ...(isObject((raw as any).query) ? (raw as any).query : {}),
          ...(isObject((raw as any).messageData) ? (raw as any).messageData : {})
        };
        const parsed = parseExecPayload(merged);
        if (parsed) return parsed;
      }
    } catch {
      // ignore and fall through
    }

    // Support both { type: 'exec', ...payload } and { type: 'exec', payload: {...} }.
    const payload = isObject((raw as any).payload) ? (raw as any).payload : raw;

    const type = getString(raw.type) ?? getString(payload.type);
    const action = getString(raw.action) ?? getString(payload.action);

    const isExecType =
      type === 'exec' || type === 'terminal.exec' || type === 'terminal:exec' || action === 'exec';
    if (!isExecType) return null;

    return parseExecPayload(payload);
  }, []);

  const openExecPage = useCallback(
    async (exec: { ns: string; pod: string; container?: string; command?: string[] }) => {
      const nextQuery: Record<string, any> = {
        ns: exec.ns,
        pod: exec.pod
      };
      if (exec.container) nextQuery.container = exec.container;
      if (exec.command && exec.command.length > 0) {
        // Preserve array semantics for `exec.tsx` decoding logic.
        nextQuery.command = JSON.stringify(exec.command);
      }

      // If already on /exec, still push to trigger props change and effect cleanup/reconnect.
      await router.push({ pathname: '/exec', query: nextQuery });
    },
    [router]
  );

  useEffect(() => {
    const cleanupSdk = createSealosApp();

    // Listen exec event from Desktop event bus.
    const cleanupExecEvent = sealosApp?.addAppEventListen?.('exec', (data: any) => {
      const parsed = normalizeExecMessage({ type: 'exec', payload: data });
      if (parsed) void openExecPage(parsed);
    });

    // Listen openDesktopApp from Desktop event bus (some masters forward it as an app event).
    const cleanupOpenDesktopAppEvent = sealosApp?.addAppEventListen?.(
      'openDesktopApp',
      (data: any) => {
        const parsed = normalizeExecMessage(data);
        if (parsed) void openExecPage(parsed);
      }
    );

    // Also listen to direct postMessage (some masters send plain {type:'exec'} messages).
    const onWindowMessage = (e: MessageEvent) => {
      // Match other apps (e.g. costcenter): require a valid source, but don't over-restrict it.
      if (!e.source) return;
      const parsed = normalizeExecMessage(e.data);
      if (parsed) void openExecPage(parsed);
    };
    window.addEventListener('message', onWindowMessage);

    (async () => {
      try {
        const result = await sealosApp.getSession();
        setSession(result);
        console.log('app init success');
      } catch (error) {
        console.log('App is not running in desktop');
      }
    })();
    return () => {
      try {
        window.removeEventListener('message', onWindowMessage);
      } catch {}
      try {
        if (typeof cleanupExecEvent === 'function') cleanupExecEvent();
      } catch {}
      try {
        if (typeof cleanupOpenDesktopAppEvent === 'function') cleanupOpenDesktopAppEvent();
      } catch {}
      try {
        if (typeof cleanupSdk === 'function') cleanupSdk();
      } catch {}
    };
  }, [normalizeExecMessage, openExecPage, setSession]);

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

export default appWithTranslation(App);
