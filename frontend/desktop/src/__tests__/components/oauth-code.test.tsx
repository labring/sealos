import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime';
import type { NextRouter } from 'next/router';
import OAuthCodePage from '@/pages/oauth2/code';
import useSessionStore from '@/stores/session';
import { consumePendingOauth2RedirectPath, setPendingOauth2RequestId } from '@/utils/oauth2';

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
    <RouterContext.Provider value={router}>
      <OAuthCodePage />
    </RouterContext.Provider>
  );

describe('authorization code consent page', () => {
  beforeEach(() => {
    sessionStorage.clear();
    replace.mockReset();
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
  it('resumes the new request after login without changing device request redirects', async () => {
    useSessionStore.setState({ token: '', session: undefined });
    renderPage();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(`/signin?oauth_code_request_id=${requestId}`)
    );
    setPendingOauth2RequestId('device-request');
    expect(consumePendingOauth2RedirectPath()).toBe('/oauth2/consent?request_id=device-request');
    expect(consumePendingOauth2RedirectPath()).toBe(`/oauth2/code?request_id=${requestId}`);
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
