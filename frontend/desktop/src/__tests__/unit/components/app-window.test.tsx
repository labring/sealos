import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';

import AppWindow from '@/components/app_window';
import type { AppInfo } from '@/stores/app';
import { APPTYPE, type WindowSize } from '@/types';

const store = vi.hoisted(() => ({
  currentApp: undefined as AppInfo | undefined,
  closeAppById: vi.fn(),
  updateOpenedAppInfo: vi.fn(),
  setToHighestLayerById: vi.fn()
}));

vi.mock('@/stores/app', () => ({
  BRAIN_APP_KEY: 'system-brain',
  default: () => ({
    closeAppById: store.closeAppById,
    updateOpenedAppInfo: store.updateOpenedAppInfo,
    setToHighestLayerById: store.setToHighestLayerById,
    currentApp: () => store.currentApp,
    findAppInfoById: () => store.currentApp,
    maxZIndex: 10
  })
}));

vi.mock('@/stores/config', () => ({
  useConfigStore: () => ({
    layoutConfig: {
      logo: '/logo.svg'
    }
  })
}));

vi.mock('@/stores/session', () => ({
  default: (selector: (state: { isGuest: () => boolean }) => unknown) =>
    selector({ isGuest: () => false })
}));

vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-Hans' }
  })
}));

vi.mock('react-draggable', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

const createApp = (key: AppInfo['key'], size: WindowSize): AppInfo =>
  ({
    pid: 1,
    isShow: true,
    zIndex: 10,
    size,
    cacheSize: size,
    style: {},
    mouseDowning: false,
    key,
    name: 'Test app',
    icon: '/test-app.svg',
    type: APPTYPE.IFRAME,
    data: {
      url: 'https://example.com',
      desc: ''
    },
    displayType: 'normal',
    representativeMeta: {
      forcedIconStyle: 'fill'
    }
  } as AppInfo);

afterEach(() => {
  vi.clearAllMocks();
  store.currentApp = undefined;
});

describe('AppWindow 标题栏', () => {
  test.each<WindowSize>(['maximize', 'maxmin', 'minimize'])(
    'system-brain 在 %s 状态下不渲染窗口标题栏',
    (size) => {
      store.currentApp = createApp('system-brain', size);

      const html = renderToStaticMarkup(<AppWindow pid={1}>Brain content</AppWindow>);

      expect(html).not.toContain('windowHeader');
      expect(html).toContain('Brain content');
    }
  );

  test('非 Brain app 保留窗口标题栏和三个窗口控制按钮', () => {
    store.currentApp = createApp('system-devbox', 'maximize');

    const html = renderToStaticMarkup(<AppWindow pid={1}>Devbox content</AppWindow>);

    expect(html).toContain('windowHeader');
    expect(html.match(/_uicon_/g)).toHaveLength(3);
    expect(html).toContain('data-type="close"');
  });
});
