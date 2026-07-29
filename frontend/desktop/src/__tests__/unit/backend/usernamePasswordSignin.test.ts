/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockPasswordLoginRequest = jest.fn();
const mockGetRegionToken = jest.fn();
const mockReplace = jest.fn();
const mockSetToken = jest.fn();
const mockSessionConfig = jest.fn();

jest.mock('@/api/auth', () => ({
  passwordLoginRequest: mockPasswordLoginRequest,
  getRegionToken: mockGetRegionToken
}));

jest.mock('next/router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    back: jest.fn()
  })
}));

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

jest.mock('@/stores/session', () => () => ({
  setToken: mockSetToken,
  setSession: jest.fn()
}));

jest.mock('@/utils/sessionConfig', () => ({
  getInviterId: jest.fn(() => null),
  getUserSemData: jest.fn(() => null),
  getAdClickData: jest.fn(() => null),
  sessionConfig: mockSessionConfig
}));

jest.mock('@chakra-ui/react', () => {
  const React = require('react');
  const DOM_PROPS = new Set([
    'autoComplete',
    'className',
    'defaultValue',
    'disabled',
    'form',
    'htmlFor',
    'id',
    'name',
    'placeholder',
    'role',
    'style',
    'tabIndex',
    'title',
    'type',
    'value'
  ]);
  const toDomProps = (props: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(props).filter(
        ([key]) =>
          DOM_PROPS.has(key) ||
          key.startsWith('aria-') ||
          key.startsWith('data-') ||
          /^on[A-Z]/.test(key)
      )
    );
  const passthrough = (element: keyof JSX.IntrinsicElements) => {
    const Component = ({ children, ...props }: any) =>
      React.createElement(element, toDomProps(props), children);
    Component.displayName = `MockChakra${element}`;
    return Component;
  };
  const Button = ({ children, isLoading, loadingText, leftIcon, rightIcon, ...props }: any) =>
    React.createElement(
      'button',
      { ...toDomProps(props), disabled: isLoading },
      isLoading ? loadingText : children
    );
  Button.displayName = 'MockChakraButton';
  const Input = React.forwardRef((props: any, ref: React.Ref<HTMLInputElement>) =>
    React.createElement('input', { ...toDomProps(props), ref })
  );
  Input.displayName = 'MockChakraInput';

  return {
    Button,
    Flex: passthrough('div'),
    FormControl: passthrough('div'),
    FormErrorMessage: passthrough('div'),
    Input,
    InputGroup: passthrough('div'),
    InputRightElement: passthrough('div'),
    Stack: passthrough('div'),
    Text: passthrough('span'),
    useColorModeValue: (value: string) => value,
    useToast: () => jest.fn()
  };
});

jest.mock('lucide-react', () => {
  const React = require('react');
  const Icon = () => React.createElement('span');
  Icon.displayName = 'MockLucideIcon';

  return {
    Eye: Icon,
    EyeOff: Icon,
    OctagonAlertIcon: Icon,
    ArrowRight: Icon
  };
});

const submitLogin = async () => {
  const { default: UsernamePasswordSignin } =
    await import('@/components/v2/UsernamePasswordSignin');
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(UsernamePasswordSignin)
    )
  );

  fireEvent.change(screen.getByPlaceholderText('common:username'), {
    target: { value: ' admin ' }
  });
  fireEvent.change(screen.getByPlaceholderText('common:password'), {
    target: { value: 'testtest' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'v2:sign_in' }));
};

describe('username password sign in flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes to workspace and skips region token when password login needs init', async () => {
    mockPasswordLoginRequest.mockResolvedValue({
      data: {
        token: 'global-token',
        needInit: true
      }
    });

    await submitLogin();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/workspace'));
    expect(mockPasswordLoginRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        user: 'admin',
        password: 'testtest'
      })
    );
    expect(mockSetToken).toHaveBeenCalledWith('global-token');
    expect(mockGetRegionToken).not.toHaveBeenCalled();
  });

  it('fetches region token and routes home when password login is initialized', async () => {
    const regionSession = { token: 'region-token', kubeconfig: 'kubeconfig' };
    mockPasswordLoginRequest.mockResolvedValue({
      data: {
        token: 'global-token',
        needInit: false
      }
    });
    mockGetRegionToken.mockResolvedValue({
      data: regionSession
    });

    await submitLogin();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(mockGetRegionToken).toHaveBeenCalledTimes(1);
    expect(mockSessionConfig).toHaveBeenCalledWith(regionSession);
  });
});
