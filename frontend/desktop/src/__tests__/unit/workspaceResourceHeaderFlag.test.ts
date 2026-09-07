/** @jest-environment jsdom */

import React from 'react';
import { ChakraProvider, useBreakpointValue } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import SecondaryLinks from '@/components/SecondaryLinks';
import { useConfigStore } from '@/stores/config';
import { getAmount } from '@/api/auth';
import { getResource } from '@/api/platform';
import { DefaultLayoutConfig } from '@/types/system';

jest.mock('@/stores/config', () => ({
  useConfigStore: jest.fn()
}));

jest.mock('@/stores/app', () => ({
  __esModule: true,
  default: () => ({ openDesktopApp: jest.fn() })
}));

jest.mock('@/stores/guideModal', () => ({
  useGuideModalStore: () => ({ openGuideModal: jest.fn(), setInitGuide: jest.fn() })
}));

jest.mock('@/stores/session', () => ({
  __esModule: true,
  default: () => ({
    session: {
      user: {
        userCrUid: 'user-1',
        ns_uid: 'ns-1'
      }
    }
  })
}));

jest.mock('@/api/platform', () => ({
  getResource: jest.fn()
}));

jest.mock('@/api/auth', () => ({
  getAmount: jest.fn()
}));

jest.mock('@sealos/ui', () => ({
  CurrencySymbol: () => null
}));

jest.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

jest.mock('@chakra-ui/react', () => {
  const actual = jest.requireActual('@chakra-ui/react');
  return {
    ...actual,
    useBreakpointValue: jest.fn()
  };
});

const mockedUseConfigStore = useConfigStore as jest.MockedFunction<typeof useConfigStore>;
const mockedUseBreakpointValue = useBreakpointValue as jest.MockedFunction<
  typeof useBreakpointValue
>;
const mockedGetResource = getResource as jest.MockedFunction<typeof getResource>;
const mockedGetAmount = getAmount as jest.MockedFunction<typeof getAmount>;

function renderSecondaryLinks(workspaceResourceHeaderEnabled?: boolean) {
  mockedUseConfigStore.mockReturnValue({
    layoutConfig: {
      common: {},
      currencySymbol: 'shellCoin',
      ...(workspaceResourceHeaderEnabled === undefined ? {} : { workspaceResourceHeaderEnabled })
    },
    commonConfig: {
      guideEnabled: false
    }
  } as ReturnType<typeof useConfigStore>);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });

  return render(
    React.createElement(
      ChakraProvider,
      null,
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(SecondaryLinks)
      )
    )
  );
}

describe('workspace resource header flag', () => {
  it('defaults to the balance header', () => {
    expect(DefaultLayoutConfig.workspaceResourceHeaderEnabled).toBe(false);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseBreakpointValue.mockReturnValue(false);
    mockedGetAmount.mockResolvedValue({
      data: { balance: 2_000_000, deductionBalance: 500_000 }
    } as never);
    mockedGetResource.mockResolvedValue({
      data: {
        workspaceQuota: [
          { type: 'cpu', used: 1, limit: 2, available: 1, usagePercent: 50 },
          { type: 'gpu', used: 1, limit: 1, available: 0, usagePercent: 100 }
        ]
      }
    } as never);
  });

  it('falls back to the balance header when the resource header is disabled', async () => {
    renderSecondaryLinks(false);

    expect(await screen.findByText('common:balance')).not.toBeNull();
    expect(screen.queryByText('common:resources')).toBeNull();
    expect(mockedGetResource).not.toHaveBeenCalled();
  });

  it('falls back to the balance header when the flag is omitted', async () => {
    renderSecondaryLinks();

    expect(await screen.findByText('common:balance')).not.toBeNull();
    expect(screen.queryByText('common:resources')).toBeNull();
    expect(mockedGetResource).not.toHaveBeenCalled();
  });

  it('uses the resource header when enabled', async () => {
    renderSecondaryLinks(true);

    expect(await screen.findByText('common:resources')).not.toBeNull();
    expect(await screen.findByText('common:balance')).not.toBeNull();
    expect(screen.queryByText('common:credits')).toBeNull();
    await waitFor(() => expect(mockedGetResource).toHaveBeenCalledTimes(1));
  });
});
