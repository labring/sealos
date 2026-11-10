import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { page } from '@vitest/browser/context';
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime';
import type { NextRouter } from 'next/router';
import OAuthCodePage from '@/pages/oauth2/code';
import '@/styles/globals.css';
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
  afterEach(async () => {
    cleanup();
    vi.unstubAllGlobals();
    await page.viewport(414, 896);
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
    expect(screen.getByRole('heading', { name: 'Authorize Application' })).toBeTruthy();
    await screen.findByText('Sealos Mobile');
    expect(screen.getByText(/Currently signed in as: Alice/)).toBeTruthy();
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
    fireEvent.click(screen.getByRole('button', { name: '接受' }));
    expect(screen.getByRole('status').textContent).toBe('正在返回应用…');
    expect((screen.getByRole('button', { name: '接受' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('matches the design geometry at desktop and mobile sizes', async () => {
    await page.viewport(1096, 754);
    await i18n.changeLanguage('zh');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(
          async () =>
            new Response(JSON.stringify({ client_name: 'Sealos Desktop', account: 'sealos_user' }))
        )
    );
    renderPage();

    const description = await screen.findByText(
      /此应用将能够使用您现有的权限访问您的 Sealos 账号和资源/
    );
    const card = (await screen.findByRole('region', { name: '授权应用' })) as HTMLElement;
    const wrapperRect = card.parentElement!.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const cardStyle = getComputedStyle(card);
    expect(cardRect.x - wrapperRect.x).toBe((wrapperRect.width - cardRect.width) / 2);
    expect(cardRect.y - wrapperRect.y).toBe((wrapperRect.height - cardRect.height) / 2);
    expect(cardRect.width).toBe(568);
    expect(cardRect.height).toBe(372);
    expect(cardStyle.padding).toBe('20px');
    expect(cardStyle.rowGap).toBe('20px');
    expect(cardStyle.borderRadius).toBe('20px');

    const heading = screen.getByRole('heading', { name: '授权应用' });
    const headingStyle = getComputedStyle(heading);
    expect(headingStyle.fontSize).toBe('24px');
    expect(headingStyle.lineHeight).toBe('28px');
    expect(headingStyle.fontWeight).toBe('500');

    const logo = card.querySelector<HTMLImageElement>('img[src="/icons/sealos-auth.svg"]');
    expect(logo?.getBoundingClientRect().width).toBe(18);
    expect(logo?.getBoundingClientRect().height).toBe(18);

    expect(getComputedStyle(description).fontSize).toBe('14px');
    expect(getComputedStyle(description).lineHeight).toBe('24px');

    const deny = screen.getByRole('button', { name: '拒绝' });
    const approve = screen.getByRole('button', { name: '接受' });
    for (const button of [deny, approve]) {
      const rect = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      expect(rect.width).toBe(85);
      expect(rect.height).toBe(36);
      expect(style.borderRadius).toBe('999px');
    }
    expect(getComputedStyle(deny.parentElement!).gap).toBe('10px');

    await act(async () => {
      await i18n.changeLanguage('en');
    });
    await waitFor(() => expect(card.getBoundingClientRect().height).toBe(396));
    expect(card.getBoundingClientRect().width).toBe(568);

    await page.viewport(375, 812);
    await waitFor(() => expect(card.getBoundingClientRect().width).toBe(343));
    const mobileWrapperRect = card.parentElement!.getBoundingClientRect();
    const mobileCardRect = card.getBoundingClientRect();
    expect(mobileCardRect.x - mobileWrapperRect.x).toBe(16);
    expect(mobileWrapperRect.width - (mobileCardRect.x - mobileWrapperRect.x) * 2).toBe(
      mobileCardRect.width
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
    fireEvent.click(await screen.findByRole('button', { name: '接受' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      '授权失败，请返回应用重新发起授权。'
    );
    expect((screen.getByRole('button', { name: '接受' }) as HTMLButtonElement).disabled).toBe(
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
