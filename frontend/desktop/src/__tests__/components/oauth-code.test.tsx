import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { RouterContext } from 'next/dist/shared/lib/router-context';
import type { NextRouter } from 'next/router';
import OAuthCodePage from '@/pages/oauth2/code';
import useSessionStore from '@/stores/session';
import { consumePendingOauth2RedirectPath, setPendingOauth2RequestId } from '@/utils/oauth2';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';

const resources = {
  en: { common: await fetch('/locales/en/common.json').then((res) => res.json()) },
  zh: { common: await fetch('/locales/zh/common.json').then((res) => res.json()) }
};
const i18n = createInstance();
await i18n.init({ lng: 'en', fallbackLng: 'en', defaultNS: 'common', resources });

// Next normally replaces these compile-time flags in browser bundles.
vi.hoisted(() => {
  Object.assign(globalThis, { process: { env: { NODE_ENV: 'test' } } });
});

const requestId = '550e8400-e29b-41d4-a716-446655440000';
const replace = vi.fn();
const router = {
  isReady: true,
  query: { request_id: requestId },
  replace
} as unknown as NextRouter;
const renderPage = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <RouterContext.Provider value={router}>
        <OAuthCodePage />
      </RouterContext.Provider>
    </I18nextProvider>
  );

describe('authorization code consent page', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    sessionStorage.clear();
    replace.mockReset();
    router.query = { request_id: requestId };
    useSessionStore.setState({
      token: 'regional-token',
      session: { user: { name: 'Alice' } } as any
    });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the authenticated account and honest access explanation', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ client_name: 'Sealos Mobile', account: 'Alice' }))
        )
    );
    renderPage();
    await screen.findByText('Sealos Mobile');
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText(/does not restrict access to selected workspaces/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Deny' })).toBeTruthy();
  });
  it('renders Chinese copy and submission status using the shared locale', async () => {
    await i18n.changeLanguage('zh');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ client_name: 'Sealos Mobile', account: 'Alice' }))
        )
        .mockImplementationOnce(() => new Promise(() => {}))
    );
    renderPage();
    expect(screen.getByRole('heading', { name: '授权应用' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('正在加载授权请求…');
    await screen.findByText('Sealos Mobile');
    expect(screen.getByText(/当前登录账号：/).textContent).toContain('Alice');
    expect(screen.getByText(/本次授权不会将访问范围限制在指定的工作空间内/)).toBeTruthy();
    expect(screen.getByText('请仅在您本人发起此请求且信任此应用时同意授权。')).toBeTruthy();
    expect(screen.getByRole('button', { name: '拒绝' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '同意授权' }));
    expect(screen.getByRole('status').textContent).toBe('正在返回应用…');
    expect((screen.getByRole('button', { name: '同意授权' }) as HTMLButtonElement).disabled).toBe(
      true
    );
  });
  it('localizes missing requests', async () => {
    await i18n.changeLanguage('zh');
    router.query = {};
    renderPage();
    expect((await screen.findByRole('alert')).textContent).toBe(
      '缺少授权请求，请返回应用重新发起授权。'
    );
  });
  it('localizes load and decision error fallbacks', async () => {
    await i18n.changeLanguage('zh');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })));
    const page = renderPage();
    expect((await screen.findByRole('alert')).textContent).toBe(
      '无法加载授权请求，请返回应用重新发起授权。'
    );
    page.unmount();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ client_name: 'Sealos Mobile', account: 'Alice' }))
        )
        .mockResolvedValueOnce(new Response('{}', { status: 500 }))
    );
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '同意授权' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      '授权失败，请返回应用重新发起授权。'
    );
    expect((screen.getByRole('button', { name: '同意授权' }) as HTMLButtonElement).disabled).toBe(
      false
    );
  });
  it('resumes the current code request instead of an abandoned device login', async () => {
    setPendingOauth2RequestId('abandoned-device-request');
    useSessionStore.setState({ token: '', session: undefined });
    renderPage();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(`/signin?oauth_code_request_id=${requestId}`)
    );
    expect(consumePendingOauth2RedirectPath()).toBe(`/oauth2/code?request_id=${requestId}`);
    expect(consumePendingOauth2RedirectPath()).toBe('');
  });
  it('resumes a newer device login without retaining the abandoned code request', async () => {
    useSessionStore.setState({ token: '', session: undefined });
    renderPage();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(`/signin?oauth_code_request_id=${requestId}`)
    );
    setPendingOauth2RequestId('device-request');
    expect(consumePendingOauth2RedirectPath()).toBe('/oauth2/consent?request_id=device-request');
    expect(consumePendingOauth2RedirectPath()).toBe('');
  });
  it('announces decision errors and lets the user recover', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ client_name: 'Desktop', account: 'Alice' }))
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error_description: 'Request expired. Start again in the app.' }),
          { status: 400 }
        )
      );
    vi.stubGlobal('fetch', fetch);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Request expired');
    expect(fetch.mock.calls[1][0]).toBe('/api/auth/oauth2/code/decision');
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
      request_id: requestId,
      decision: 'approve'
    });
    expect((screen.getByRole('button', { name: 'Approve' }) as HTMLButtonElement).disabled).toBe(
      false
    );
  });
});
