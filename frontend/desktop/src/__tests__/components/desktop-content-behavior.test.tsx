import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Desktop from '@/components/desktop_content';

type RegisteredHandler = (data: { appKey: string }) => void;

const mocks = vi.hoisted(() => {
  const handlers = new Map<string, RegisteredHandler>();
  const notification = Object.assign(vi.fn(), { close: vi.fn() });

  return {
    handlers,
    appState: {
      installedApps: [{ key: 'system-template' }],
      runningInfo: [{ key: 'system-template', pid: 42 }],
      openApp: vi.fn(),
      setToHighestLayerById: vi.fn(),
      closeAppById: vi.fn(),
      setAutoLaunch: vi.fn(),
      currentAppKey: 'system-brain'
    },
    config: {
      layoutConfig: {
        common: {
          bannerEnabled: false
        }
      },
      cloudConfig: {
        allowedOrigins: ['*']
      },
      commonConfig: {
        guideEnabled: false,
        realNameAuthEnabled: false
      }
    },
    guideModal: {
      openGuideModal: vi.fn()
    },
    sessionState: {
      session: undefined,
      isGuest: () => false,
      openGuestLoginModal: vi.fn(),
      showGuestLoginModal: false,
      closeGuestLoginModal: vi.fn()
    },
    addEventListen: vi.fn(),
    createMasterAPP: vi.fn(() => vi.fn()),
    notification
  };
});

vi.mock('@/stores/app', () => ({
  BRAIN_APP_KEY: 'system-brain',
  SESSION_RESTORE_APP_KEY: 'sealos_desktop_restore_app_key',
  default: () => mocks.appState
}));

vi.mock('@/stores/config', () => {
  const useConfigStore = () => mocks.config;
  useConfigStore.getState = () => mocks.config;
  return { useConfigStore };
});

vi.mock('@/stores/desktopConfig', () => ({
  useDesktopConfigStore: () => ({
    isAppBar: false
  })
}));

vi.mock('@/stores/appDisplayConfig', () => ({
  useAppDisplayConfigStore: () => ({
    backgroundImage: ''
  })
}));

vi.mock('@/stores/guideModal', () => ({
  useGuideModalStore: () => mocks.guideModal
}));

vi.mock('@/stores/session', () => ({
  default: () => mocks.sessionState
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: undefined,
    isSuccess: false
  })
}));

vi.mock('@/api/platform', () => ({
  getWorkspaceQuota: vi.fn()
}));

vi.mock('@/api/auth', () => ({
  getAmount: vi.fn(),
  UserInfo: vi.fn()
}));

vi.mock('sealos-desktop-sdk/master', () => ({
  createMasterAPP: mocks.createMasterAPP,
  masterApp: {
    addEventListen: mocks.addEventListen
  }
}));

vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

vi.mock('next/dynamic', () => {
  const dynamic = () => () => null;
  return {
    __esModule: true,
    default: Object.assign(dynamic, { default: dynamic })
  };
});

vi.mock('@chakra-ui/react', async () => {
  const { createElement } = await import('react');
  type MockComponentProps = React.PropsWithChildren<{
    id?: string;
    onClick?: React.MouseEventHandler;
    src?: string;
    alt?: string;
    'aria-busy'?: boolean;
    'data-testid'?: string;
  }>;
  const component =
    (tag: string) =>
    ({
      children,
      id,
      onClick,
      src,
      alt,
      'aria-busy': ariaBusy,
      'data-testid': testId
    }: MockComponentProps) =>
      createElement(
        tag,
        {
          id,
          onClick,
          src,
          alt,
          'aria-busy': ariaBusy,
          'data-testid': testId
        },
        children
      );

  return {
    Box: component('div'),
    Flex: component('div'),
    Image: component('img'),
    Button: component('button'),
    Text: component('span')
  };
});

vi.mock('@/components/app_window', () => ({
  default: ({ children }: React.PropsWithChildren) => children
}));

vi.mock('@/components/desktop_content/iframe_window', () => ({
  default: () => null
}));

vi.mock('@/components/desktop_content/ChakraIndicator', () => ({
  ChakraIndicator: () => null
}));

vi.mock('@/components/account/AccountCenter/mergeUser/NeedToMergeModal', () => ({
  default: () => null
}));

vi.mock('@/components/account/RealNameModal', () => ({
  useRealNameAuthNotification: () => mocks.notification
}));

vi.mock('@/components/LoginModal', () => ({
  default: () => null
}));

vi.mock('@/components/desktop_content/serviceButton', () => ({
  default: () => null
}));

vi.mock('@/components/banner', () => ({
  default: () => null
}));

vi.mock('@/components/account/GuideModal', () => ({
  default: () => null
}));

vi.mock('@/components/desktop_content/GlobalNotification', () => ({
  GlobalNotification: () => null
}));

vi.mock('@/components/AppDock', () => ({
  default: () => null
}));

vi.mock('@/components/floating_button', () => ({
  default: () => null
}));

vi.mock('@/components/account', () => ({
  default: () => null
}));

vi.mock('@/components/desktop_content/apps', () => ({
  default: () => null
}));

const mountedRoots: Array<{ root: Root; container: HTMLDivElement }> = [];

const renderDesktop = async (element: React.ReactElement) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push({ root, container });

  const rerender = async (nextElement: React.ReactElement) => {
    await act(async () => {
      root.render(nextElement);
    });
  };

  await rerender(element);
  return { rerender };
};

describe('Desktop startup and guide behavior', () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    sessionStorage.clear();
    localStorage.clear();
    mocks.handlers.clear();
    mocks.appState.currentAppKey = 'system-brain';
    mocks.config.commonConfig.guideEnabled = false;
    vi.clearAllMocks();
    mocks.addEventListen.mockImplementation((eventName: string, handler: RegisteredHandler) => {
      mocks.handlers.set(eventName, handler);
      return () => {
        if (mocks.handlers.get(eventName) === handler) {
          mocks.handlers.delete(eventName);
        }
      };
    });
  });

  afterEach(async () => {
    for (const { root, container } of mountedRoots.splice(0)) {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
  });

  it('preserves the tab-local restore key until the initial target is ready', async () => {
    sessionStorage.setItem('sealos_desktop_restore_app_key', 'system-template');

    const { rerender } = await renderDesktop(
      <Desktop initialAppLaunch={{ status: 'resolving' }} onInitialAppLoaded={vi.fn()} />
    );

    expect(mocks.createMasterAPP).toHaveBeenCalled();
    expect(sessionStorage.getItem('sealos_desktop_restore_app_key')).toBe('system-template');

    await rerender(
      <Desktop
        initialAppLaunch={{ status: 'loading', appKey: 'system-template' }}
        onInitialAppLoaded={vi.fn()}
      />
    );
    expect(sessionStorage.getItem('sealos_desktop_restore_app_key')).toBe('system-template');

    mocks.appState.currentAppKey = 'system-template';
    await rerender(<Desktop initialAppLaunch={{ status: 'ready' }} onInitialAppLoaded={vi.fn()} />);

    expect(sessionStorage.getItem('sealos_desktop_restore_app_key')).toBe('system-template');
  });

  it('synchronizes the selected Brain target only after startup is ready', async () => {
    sessionStorage.setItem('sealos_desktop_restore_app_key', 'system-template');

    const { rerender } = await renderDesktop(
      <Desktop initialAppLaunch={{ status: 'resolving' }} onInitialAppLoaded={vi.fn()} />
    );

    expect(mocks.createMasterAPP).toHaveBeenCalled();
    expect(sessionStorage.getItem('sealos_desktop_restore_app_key')).toBe('system-template');

    await rerender(<Desktop initialAppLaunch={{ status: 'ready' }} onInitialAppLoaded={vi.fn()} />);

    expect(sessionStorage.getItem('sealos_desktop_restore_app_key')).toBeNull();
  });

  it('clears a stale restore key after startup resolves to Desktop', async () => {
    sessionStorage.setItem('sealos_desktop_restore_app_key', 'system-template');
    mocks.appState.currentAppKey = '';

    const { rerender } = await renderDesktop(
      <Desktop initialAppLaunch={{ status: 'resolving' }} onInitialAppLoaded={vi.fn()} />
    );

    expect(sessionStorage.getItem('sealos_desktop_restore_app_key')).toBe('system-template');

    await rerender(<Desktop initialAppLaunch={{ status: 'ready' }} onInitialAppLoaded={vi.fn()} />);

    expect(sessionStorage.getItem('sealos_desktop_restore_app_key')).toBeNull();
  });

  it('closes the source app without opening Desktop guidance when guides are disabled', async () => {
    await renderDesktop(
      <Desktop initialAppLaunch={{ status: 'resolving' }} onInitialAppLoaded={vi.fn()} />
    );

    expect(mocks.handlers.has('quitGuide')).toBe(true);

    act(() => {
      mocks.handlers.get('quitGuide')?.({ appKey: 'system-template' });
    });

    expect(mocks.appState.closeAppById).toHaveBeenCalledWith(42);
    expect(mocks.guideModal.openGuideModal).not.toHaveBeenCalled();
  });

  it('closes the source app and opens Desktop guidance when guides are enabled', async () => {
    mocks.config.commonConfig.guideEnabled = true;
    await renderDesktop(
      <Desktop initialAppLaunch={{ status: 'resolving' }} onInitialAppLoaded={vi.fn()} />
    );

    expect(mocks.handlers.has('quitGuide')).toBe(true);

    act(() => {
      mocks.handlers.get('quitGuide')?.({ appKey: 'system-template' });
    });

    expect(mocks.appState.closeAppById).toHaveBeenCalledWith(42);
    expect(mocks.guideModal.openGuideModal).toHaveBeenCalledOnce();
    expect(mocks.appState.closeAppById.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.guideModal.openGuideModal.mock.invocationCallOrder[0]
    );
  });
});
