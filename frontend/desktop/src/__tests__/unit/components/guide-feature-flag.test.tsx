import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SecondaryLinks from '@/components/SecondaryLinks';
import { GlobalAnnouncement } from '@/components/desktop_content/GlobalAnnouncement';

const mocks = vi.hoisted(() => ({
  config: {
    layoutConfig: {
      version: 'cn',
      currencySymbol: 'shellCoin',
      common: {
        announcementEnabled: true,
        subscriptionEnabled: false
      }
    },
    commonConfig: {
      guideEnabled: false
    }
  },
  queryData: undefined as unknown,
  openGuideModal: vi.fn(),
  setInitGuide: vi.fn()
}));

vi.mock('@/stores/config', () => ({
  useConfigStore: (selector?: (state: typeof mocks.config) => unknown) =>
    selector ? selector(mocks.config) : mocks.config
}));

vi.mock('@/stores/app', () => ({
  default: () => ({
    openDesktopApp: vi.fn()
  })
}));

vi.mock('@/stores/guideModal', () => ({
  useGuideModalStore: () => ({
    openGuideModal: mocks.openGuideModal,
    setInitGuide: mocks.setInitGuide
  })
}));

vi.mock('@/stores/session', () => ({
  default: () => ({
    session: undefined,
    isGuest: () => false
  })
}));

vi.mock('@/stores/subscription', () => ({
  useSubscriptionStore: () => ({
    subscriptionInfo: undefined,
    fetchSubscriptionInfo: vi.fn()
  })
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: mocks.queryData
  })
}));

vi.mock('@/components/account/BalancePopover', () => ({
  BalancePopover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  getPlanBackground: () => 'transparent'
}));

vi.mock('@/components/account/JoinDiscordPrompt', () => ({
  JoinDiscordPrompt: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('@sealos/ui', () => ({
  CurrencySymbol: () => <span>currency</span>
}));

vi.mock('@sealos/shadcn-ui', () => ({
  cn: (...values: string[]) => values.filter(Boolean).join(' ')
}));

vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-Hans' }
  })
}));

vi.mock('dompurify', () => ({
  default: {
    sanitize: (value: string) => value
  }
}));

vi.mock('@sealos/gtm', () => ({
  track: vi.fn()
}));

vi.mock('@chakra-ui/react', async () => {
  const actual = await vi.importActual<typeof import('@chakra-ui/react')>('@chakra-ui/react');
  return {
    ...actual,
    useBreakpointValue: () => false
  };
});

describe('guide feature flag', () => {
  beforeEach(() => {
    mocks.config.commonConfig.guideEnabled = false;
    mocks.queryData = undefined;
    vi.clearAllMocks();
  });

  it('hides the manual guide entry when guideEnabled is false', () => {
    const html = renderToStaticMarkup(<SecondaryLinks />);

    expect(html).not.toContain('common:guide');
  });

  it('shows the manual guide entry when guideEnabled is true', () => {
    mocks.config.commonConfig.guideEnabled = true;

    const html = renderToStaticMarkup(<SecondaryLinks />);

    expect(html).toContain('common:guide');
  });

  it('hides only the guide fallback when guideEnabled is false', () => {
    const html = renderToStaticMarkup(<GlobalAnnouncement />);

    expect(html).not.toContain('v2:onboard_guide');
  });

  it('keeps a real regional announcement visible when guideEnabled is false', () => {
    mocks.queryData = [
      {
        uid: 'announcement-1',
        from: 'Desktop-Announcement',
        i18n: {
          'zh-Hans': {
            title: '中国区推荐公告'
          }
        }
      }
    ];

    const html = renderToStaticMarkup(<GlobalAnnouncement />);

    expect(html).toContain('中国区推荐公告');
  });
});
