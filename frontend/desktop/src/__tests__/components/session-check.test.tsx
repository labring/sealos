import React, { StrictMode } from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { checkSessionStatus, nsListRequest, init, state, appState, config, router } = vi.hoisted(
  () => {
    const init = vi.fn();
    return {
      checkSessionStatus: vi.fn(),
      nsListRequest: vi.fn(),
      init,
      state: {
        token: 'regional-token',
        session: undefined as any,
        firstUse: null,
        hasEverLoggedIn: true,
        isUserLogin: vi.fn(),
        setFirstUse: vi.fn(),
        setGuestSession: vi.fn(),
        setSessionProp: vi.fn(),
        setHasEverLoggedIn: vi.fn()
      },
      appState: {
        init,
        setAutoLaunch: vi.fn(),
        installedApps: [],
        runningInfo: [],
        launchQuery: {}
      },
      config: {
        layoutConfig: { version: 'en', meta: {}, common: { guestModeEnabled: true } },
        commonConfig: {},
        trackingConfig: {},
        authConfig: { captcha: { ali: { enabled: false } }, idp: {} },
        cloudConfig: {}
      },
      router: { isReady: true, query: { openapp: 'desktop' }, pathname: '/', replace: vi.fn() }
    };
  }
);
vi.mock('@/api/auth', () => ({
  checkSessionStatus,
  UserInfo: async () => ({ data: { info: { oauthProvider: [] } } }),
  getPlanInfo: vi.fn(),
  issueMarketingConsentToken: vi.fn()
}));
vi.mock('@/api/namespace', () => ({
  nsListRequest,
  switchRequest: vi.fn()
}));
vi.mock('@/types/team', () => ({ NSType: { Team: 0, Private: 1 } }));
vi.mock('@/stores/session', () => ({
  default: Object.assign(() => state, { getState: () => state })
}));
vi.mock('@/stores/app', () => ({
  default: Object.assign((selector?: any) => (selector ? selector(appState) : appState), {
    getState: () => appState
  }),
  BRAIN_APP_KEY: 'system-brain',
  SESSION_RESTORE_APP_KEY: 'session-restore-app'
}));
vi.mock('@/stores/config', () => ({ useConfigStore: () => config }));
vi.mock('@/stores/callback', () => ({ default: () => ({}) }));
vi.mock('@/stores/desktopConfig', () => ({
  useDesktopConfigStore: () => ({ setCanShowGuide: vi.fn() })
}));
vi.mock('@/stores/script', () => ({ default: () => ({ setCaptchaIsLoad: vi.fn() }) }));
vi.mock('@/hooks/useSemParams', () => ({ useSemParams: () => ({}) }));
vi.mock('@/hooks/useLicenseCheck', () => ({ useLicenseCheck: vi.fn() }));
vi.mock('@/utils/ssrLocale', () => ({ ensureLocaleCookie: vi.fn() }));
vi.mock('next-i18next/serverSideTranslations', () => ({ serverSideTranslations: vi.fn() }));
vi.mock('next/router', () => ({ useRouter: () => router }));
vi.mock('next/head', () => ({ __esModule: true, default: () => null }));
vi.mock('next/script', () => ({ default: () => null }));
vi.mock('@chakra-ui/react', () => ({
  Box: ({ children }: any) => <div>{children}</div>,
  useColorMode: () => ({ colorMode: 'light' }),
  useDisclosure: () => ({ isOpen: false })
}));
vi.mock('@/components/desktop_content', () => ({
  default: ({ initialAppLaunch }: any) => <output>{initialAppLaunch.status}</output>
}));
vi.mock('@/components/account/AccountCenter/PhoneBindingModal', () => ({
  PhoneBindingModal: () => null
}));

import Home from '@/pages/index';

let client: QueryClient;
const openDesktop = (strict = false) => {
  const page = (
    <QueryClientProvider client={client}>
      <Home sealos_cloud_domain="cloud.example.com" />
    </QueryClientProvider>
  );
  return render(strict ? <StrictMode>{page}</StrictMode> : page);
};

describe('desktop session query on opening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    state.token = 'regional-token';
    state.session = { user: { userId: 'alice' }, kubeconfig: 'browser-old-kc', subscription: {} };
    state.isUserLogin.mockImplementation(() => !!state.session?.user && !state.session?.isGuest);
    checkSessionStatus.mockResolvedValue({ code: 200 });
    nsListRequest.mockResolvedValue({ data: { namespaces: [] } });
    init.mockResolvedValue(appState);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });
  afterEach(() => {
    cleanup();
    client.clear();
    vi.useRealTimers();
  });

  it('waits for authentication before initializing the actual desktop page', async () => {
    let finish!: (result: { code: number }) => void;
    checkSessionStatus.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    openDesktop();
    expect(checkSessionStatus).toHaveBeenCalledWith('browser-old-kc');
    expect(init).not.toHaveBeenCalled();
    expect(nsListRequest).not.toHaveBeenCalled();
    await act(async () => finish({ code: 200 }));
    await waitFor(() => expect(init).toHaveBeenCalledOnce());
  });

  it('does not repeat checks on StrictMode, workspace changes, focus, reconnect or timers', async () => {
    const page = openDesktop(true);
    await waitFor(() => expect(init).toHaveBeenCalledOnce());
    state.session = { ...state.session, kubeconfig: 'same-credentials-different-namespace' };
    state.token = 'new-workspace-token';
    page.rerender(
      <StrictMode>
        <QueryClientProvider client={client}>
          <Home sealos_cloud_domain="cloud.example.com" />
        </QueryClientProvider>
      </StrictMode>
    );
    vi.useFakeTimers();
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('online'));
    document.dispatchEvent(new Event('visibilitychange'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    });
    expect(checkSessionStatus).toHaveBeenCalledTimes(1);
  });

  it('does not recheck when workspace switching clears the query cache', async () => {
    const page = openDesktop();
    await waitFor(() => expect(init).toHaveBeenCalledOnce());
    await act(async () => {
      client.clear();
    });
    state.session = { ...state.session, kubeconfig: 'another-workspace' };
    page.rerender(
      <QueryClientProvider client={client}>
        <Home sealos_cloud_domain="cloud.example.com" />
      </QueryClientProvider>
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(checkSessionStatus).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, { isGuest: true, user: null, kubeconfig: '' }])(
    'skips logged-out and guest sessions',
    async (session) => {
      state.session = session;
      openDesktop();
      await act(async () => {
        await Promise.resolve();
      });
      expect(checkSessionStatus).not.toHaveBeenCalled();
    }
  );

  it('checks when a logged-in session becomes available', async () => {
    const session = state.session;
    state.session = undefined;
    const page = openDesktop();
    state.session = session;
    page.rerender(
      <QueryClientProvider client={client}>
        <Home sealos_cloud_domain="cloud.example.com" />
      </QueryClientProvider>
    );
    await waitFor(() => expect(checkSessionStatus).toHaveBeenCalledTimes(1));
  });

  it.each([{ code: 401 }, { response: { status: 401 } }])(
    'blocks initialization while an expired session redirects',
    async (error) => {
      checkSessionStatus.mockRejectedValue(error);
      const page = openDesktop();
      await waitFor(() => expect(client.getQueryState(['sessionCheck'])?.status).toBe('error'));
      expect(init).not.toHaveBeenCalled();
      state.session = undefined;
      state.token = '';
      page.rerender(
        <QueryClientProvider client={client}>
          <Home sealos_cloud_domain="cloud.example.com" />
        </QueryClientProvider>
      );
      await act(async () => {
        await Promise.resolve();
      });
      expect(init).not.toHaveBeenCalled();
    }
  );

  it.each([{ code: 503 }, { code: 'ECONNABORTED', config: { data: 'private-kubeconfig' } }])(
    'continues initialization on a transient failure without retrying',
    async (error) => {
      checkSessionStatus.mockRejectedValue(error);
      openDesktop();
      await waitFor(() => expect(init).toHaveBeenCalledOnce());
      expect(checkSessionStatus).toHaveBeenCalledTimes(1);
      expect(client.getQueryState(['sessionCheck'])?.error).not.toHaveProperty('config');
    }
  );

  it('checks again when desktop is opened again with the same QueryClient', async () => {
    const first = openDesktop();
    await waitFor(() => expect(init).toHaveBeenCalledOnce());
    first.unmount();
    let finish!: (result: { code: number }) => void;
    checkSessionStatus.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    openDesktop();
    await waitFor(() => expect(checkSessionStatus).toHaveBeenCalledTimes(2));
    expect(init).toHaveBeenCalledTimes(1);
    await act(async () => finish({ code: 200 }));
    await waitFor(() => expect(init).toHaveBeenCalledTimes(2));
  });
});
