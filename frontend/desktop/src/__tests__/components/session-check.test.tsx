import React, { StrictMode } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { checkSessionStatus, state } = vi.hoisted(() => ({
  checkSessionStatus: vi.fn(),
  state: { token: 'regional-token', session: undefined as any }
}));
vi.mock('@/api/auth', () => ({ checkSessionStatus }));
vi.mock('@/stores/session', () => ({ default: () => state }));

import { useSessionCheck } from '@/hooks/useSessionCheck';

describe('desktop session check on opening', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    state.token = 'regional-token';
    state.session = { user: { userId: 'alice' }, kubeconfig: 'browser-old-kc' };
    checkSessionStatus.mockResolvedValue({ code: 200 });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('waits for authentication before allowing initialization', async () => {
    let finish!: (result: { code: number }) => void;
    checkSessionStatus.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const hook = renderHook(() => useSessionCheck());
    expect(hook.result.current).toBe(false);
    expect(checkSessionStatus).toHaveBeenCalledWith('browser-old-kc');
    await act(async () => finish({ code: 200 }));
    expect(hook.result.current).toBe(true);
  });

  it('does not repeat checks on StrictMode, workspace changes, focus, reconnect or timers', async () => {
    const hook = renderHook(() => useSessionCheck(), {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>
    });
    await waitFor(() => expect(hook.result.current).toBe(true));
    state.session = { ...state.session, kubeconfig: 'same-credentials-different-namespace' };
    state.token = 'new-workspace-token';
    hook.rerender();
    vi.useFakeTimers();
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('online'));
    document.dispatchEvent(new Event('visibilitychange'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    });
    expect(checkSessionStatus).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, { isGuest: true, user: null, kubeconfig: '' }])(
    'skips logged-out and guest sessions',
    (session) => {
      state.session = session;
      const hook = renderHook(() => useSessionCheck());
      expect(hook.result.current).toBe(true);
      expect(checkSessionStatus).not.toHaveBeenCalled();
    }
  );

  it('checks once when a logged-in session becomes available', async () => {
    const session = state.session;
    state.session = undefined;
    const hook = renderHook(() => useSessionCheck());
    state.session = session;
    hook.rerender();
    await waitFor(() => expect(hook.result.current).toBe(true));
    expect(checkSessionStatus).toHaveBeenCalledTimes(1);
  });

  it.each([{ code: 401 }, { response: { status: 401 } }])(
    'blocks initialization while an expired session redirects',
    async (error) => {
      checkSessionStatus.mockRejectedValue(error);
      const hook = renderHook(() => useSessionCheck());
      await act(async () => {
        await Promise.resolve();
      });
      expect(hook.result.current).toBe(false);
      state.session = undefined;
      state.token = '';
      hook.rerender();
      expect(hook.result.current).toBe(false);
    }
  );

  it.each([{ code: 503 }, { code: 'ECONNABORTED' }])(
    'keeps the session usable on a transient failure',
    async (error) => {
      checkSessionStatus.mockRejectedValue(error);
      const hook = renderHook(() => useSessionCheck());
      await waitFor(() => expect(hook.result.current).toBe(true));
    }
  );

  it('checks again when desktop is opened again', async () => {
    const first = renderHook(() => useSessionCheck());
    await waitFor(() => expect(first.result.current).toBe(true));
    first.unmount();
    const second = renderHook(() => useSessionCheck());
    await waitFor(() => expect(second.result.current).toBe(true));
    expect(checkSessionStatus).toHaveBeenCalledTimes(2);
  });
});
