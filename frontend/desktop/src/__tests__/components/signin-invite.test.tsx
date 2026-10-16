import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime';
import type { NextRouter } from 'next/router';

const zh: Record<string, string> = await fetch('/locales/zh/common.json').then((res) => res.json());
const sessionState = vi.hoisted(() => ({ token: '', session: undefined as any }));

vi.hoisted(() => {
  Object.assign(globalThis, { process: { env: { NODE_ENV: 'test' } } });
});
vi.mock('public/images/signin_bg.png', () => ({ default: { src: '' } }));
vi.mock('public/images/signin_bg_zh.png', () => ({ default: { src: '' } }));
vi.mock('@/stores/session', () => ({
  default: () => ({ ...sessionState, generateState: vi.fn(), setProvider: vi.fn() })
}));
vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'zh' },
    t: (key: string) => zh[key.replace('common:', '') as keyof typeof zh] ?? key
  })
}));
vi.mock('@/stores/config', () => ({
  useConfigStore: () => ({
    isLoaded: false,
    layoutConfig: {
      version: 'cn',
      meta: {},
      protocol: { serviceProtocol: { zh: '/terms' }, privateProtocol: { zh: '/privacy' } }
    },
    authConfig: {
      captcha: { ali: { enabled: false } },
      idp: { sms: { enabled: false }, email: { enabled: false }, github: { enabled: true } }
    }
  })
}));
vi.mock('@/components/signin/auth/useProtocol', () => ({ default: () => ({}) }));
vi.mock('@/components/v2/GitHubReauthPrompt', () => ({ GitHubReauthPrompt: () => null }));
vi.mock('@/components/v2/UsernamePasswordSignin', () => ({ default: () => null }));
vi.mock('@/components/v2/EmailSigninForm', () => ({ EmailSigninForm: () => null }));
vi.mock('@/components/v2/PhoneSigninForm', () => ({ PhoneSigninForm: () => null }));
vi.mock('@/components/v2/EmailCheckForm', () => ({ EmailCheckForm: () => null }));
vi.mock('@/components/v2/PhoneCheckForm', () => ({ PhoneCheckForm: () => null }));

import SignLayout from '@/components/v2/SignLayout';
import SigninComponent from '@/components/v2/Sign';
import SigninInviteNotice from '@/components/v2/SigninInviteNotice';

const reload = vi.fn();
const replace = vi.fn();
const router = {
  isReady: true,
  query: { invite: 'ABCD2345' },
  reload,
  replace
} as unknown as NextRouter;

const renderPage = (inviteIssue: 'error' | 'disabled' | null) =>
  render(
    <RouterContext.Provider value={router}>
      <ChakraProvider>
        <SignLayout>
          <SigninComponent
            notice={inviteIssue && <SigninInviteNotice issue={inviteIssue} onRetry={reload} />}
          />
        </SignLayout>
      </ChakraProvider>
    </RouterContext.Provider>
  );

describe('signin invitation feedback', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    Object.assign(sessionState, { token: '', session: undefined });
  });
  afterEach(() => cleanup());

  it('announces acceptance failures and lets users retry while signin stays available', async () => {
    renderPage('error');
    expect(screen.getByRole('alert').textContent).toContain('邀请接收失败');
    const retry = screen.getByRole('button', { name: '重新接收邀请' });
    retry.focus();
    expect(document.activeElement).toBe(retry);
    fireEvent.click(retry);
    expect(reload).toHaveBeenCalledOnce();
    expect((screen.getByRole('button', { name: 'GitHub' }) as HTMLButtonElement).disabled).toBe(
      false
    );
  });

  it('shows disabled invitations without claiming success or hiding normal signin', () => {
    renderPage('disabled');
    expect(screen.getByRole('alert').textContent).toContain('邀请链接已停用');
    expect(screen.queryByRole('button', { name: '重新接收邀请' })).toBeNull();
    expect(screen.getByRole('button', { name: 'GitHub' })).toBeTruthy();
  });

  it('keeps the existing redirect for signed-in users', async () => {
    Object.assign(sessionState, {
      token: 'regional-token',
      session: { user: { name: 'Alice' } } as any
    });
    renderPage(null);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
