/** @jest-environment jsdom */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Notification from '@/components/notification';

const mockListNotification = jest.fn();
const mockPost = jest.fn();
const mockMessage = jest.fn();
const mockI18n = { language: 'zh' };
const mockRefetchOnOpen = { isOpen: true, onClose: jest.fn() };

jest.mock('@/api/platform', () => ({ listNotification: () => mockListNotification() }));
jest.mock('@/services/request', () => ({
  __esModule: true,
  default: { post: (...args: any[]) => mockPost(...args) }
}));
jest.mock('@/stores/app', () => ({
  __esModule: true,
  default: () => ({ openDesktopApp: jest.fn() })
}));
jest.mock('@sealos/ui', () => ({
  NotificationIcon: () => null,
  WarnIcon: () => null,
  useMessage: () => ({ message: mockMessage })
}));
jest.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: mockI18n })
}));

// Fictional fixtures only; no cluster or account access.
const notice = (name: string, isRead: boolean, timestamp = 1) => ({
  uid: name,
  name,
  isRead,
  timestamp,
  desktopPopup: true,
  i18n: {
    en: { from: 'License-System', title: name, message: `${name} details` },
    zh: { from: '许可证系统', title: name, message: `${name} details` }
  }
});

let client: QueryClient;
let onAmount: jest.Mock;
const tree = (isOpen = true) =>
  React.createElement(
    QueryClientProvider,
    { client },
    React.createElement(
      ChakraProvider,
      null,
      React.createElement(
        Notification,
        {
          disclosure: { ...mockRefetchOnOpen, isOpen },
          onAmount
        } as React.ComponentProps<typeof Notification>,
        React.createElement('button', null, '通知')
      )
    )
  );

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  onAmount = jest.fn();
});
afterEach(() => {
  cleanup();
  client.clear();
});

it('hides recovered license and balance notices while retaining unread notices and count', async () => {
  mockListNotification.mockResolvedValue({
    data: [notice('许可证缺失', true), notice('余额耗尽', true), notice('待处理告警', false)]
  });
  render(tree());
  await screen.findByText('待处理告警');
  expect(screen.queryByText('许可证缺失')).toBeNull();
  expect(screen.queryByText('余额耗尽')).toBeNull();
  expect(onAmount).toHaveBeenLastCalledWith(1);
});

it('waits for mark-all to finish before refreshing and shows the empty state', async () => {
  let finish!: (value: any) => void;
  mockListNotification.mockResolvedValue({ data: [notice('待处理告警', false)] });
  mockPost.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  render(tree());
  await screen.findByText('待处理告警');
  const before = mockListNotification.mock.calls.length;
  fireEvent.click(screen.getByText('common:read_all'));
  await waitFor(() =>
    expect(mockPost).toHaveBeenCalledWith('/api/notification/read', { name: ['待处理告警'] })
  );
  expect(mockListNotification).toHaveBeenCalledTimes(before);
  expect(screen.queryByText('待处理告警')).not.toBeNull();
  mockListNotification.mockResolvedValue({ data: [notice('待处理告警', true)] });
  finish({ data: [] });
  await screen.findByText('common:no_notifications_yet');
  expect(screen.queryByText('待处理告警')).toBeNull();
  expect(onAmount).toHaveBeenLastCalledWith(0);
});

it('refreshes recovered notifications when reopening the panel', async () => {
  mockListNotification.mockResolvedValue({ data: [notice('许可证缺失', false)] });
  const view = render(tree());
  await screen.findByText('许可证缺失');
  view.rerender(tree(false));
  mockListNotification.mockResolvedValue({ data: [notice('许可证缺失', true)] });
  view.rerender(tree(true));
  await screen.findByText('common:no_notifications_yet');
  expect(screen.queryByText('许可证缺失')).toBeNull();
  expect(onAmount).toHaveBeenLastCalledWith(0);
});

it('keeps unread alerts when the read API refuses permission', async () => {
  mockListNotification.mockResolvedValue({ data: [notice('待处理告警', false)] });
  mockPost.mockResolvedValue({ data: { code: 403, reason: 'Forbidden' } });
  render(tree());
  await screen.findByText('待处理告警');
  fireEvent.click(screen.getByText('common:read_all'));
  await waitFor(() =>
    expect(mockMessage).toHaveBeenCalledWith({ status: 'warning', title: 'Forbidden' })
  );
  expect(screen.queryByText('待处理告警')).not.toBeNull();
  expect(onAmount).toHaveBeenLastCalledWith(1);
});
