/** @jest-environment jsdom */

import React from 'react';
import { ChakraProvider, useBreakpointValue } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import SecondaryLinks from '@/components/SecondaryLinks';
import { useConfigStore } from '@/stores/config';

const openGuideModal = jest.fn();
const setInitGuide = jest.fn();

jest.mock('@/stores/config', () => ({
  useConfigStore: jest.fn()
}));

jest.mock('@/stores/app', () => ({
  __esModule: true,
  default: () => ({ openDesktopApp: jest.fn() })
}));

jest.mock('@/stores/guideModal', () => ({
  useGuideModalStore: () => ({ openGuideModal, setInitGuide })
}));

jest.mock('@/stores/session', () => ({
  __esModule: true,
  default: () => ({ session: undefined })
}));

jest.mock('@/api/platform', () => ({ getResource: jest.fn() }));
jest.mock('@/api/auth', () => ({ getAmount: jest.fn() }));

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

function renderSecondaryLinks(guideEnabled: boolean) {
  mockedUseConfigStore.mockReturnValue({
    layoutConfig: {
      common: {}
    },
    commonConfig: {
      guideEnabled
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

describe('guide feature flag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseBreakpointValue.mockReturnValue(false);
  });

  it('hides the guide entry when the feature is disabled', () => {
    renderSecondaryLinks(false);

    expect(screen.queryByText('common:guide')).toBeNull();
  });

  it('shows the guide entry and opens the guide when enabled', () => {
    renderSecondaryLinks(true);

    fireEvent.click(screen.getByText('common:guide'));

    expect(openGuideModal).toHaveBeenCalledTimes(1);
    expect(setInitGuide).toHaveBeenCalledWith(false);
  });
});
