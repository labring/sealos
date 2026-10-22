import axios from 'axios';
import { checkSessionStatus } from '@/api/auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { state, clearSharedAuthCookie, clearPersistedMarketingQuery, replace } = vi.hoisted(() => ({
  state: {
    token: 'regional-token',
    isGuest: vi.fn(),
    delSession: vi.fn(),
    setToken: vi.fn(),
    setGlobalToken: vi.fn()
  },
  clearSharedAuthCookie: vi.fn(),
  clearPersistedMarketingQuery: vi.fn(),
  replace: vi.fn()
}));
vi.mock('@/stores/session', () => ({ default: { getState: () => state } }));
vi.mock('@/utils/cookieUtils', () => ({ clearSharedAuthCookie }));
vi.mock('@/utils/marketing-attribution', () => ({ clearPersistedMarketingQuery }));

import request from '@/services/request';

describe('session expiry scoped to the kubeconfig check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { location: { replace } });
    state.isGuest.mockReturnValue(false);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends current kubeconfig and regional JWT without using the shared interceptor', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { code: 200 } });
    await expect(checkSessionStatus('browser-kc')).resolves.toEqual({ code: 200 });
    expect(post).toHaveBeenCalledWith(
      '/api/auth/checkStatus',
      { kubeconfig: 'browser-kc' },
      { headers: { Authorization: 'regional-token' }, withCredentials: true, timeout: 20000 }
    );
    expect(state.delSession).not.toHaveBeenCalled();
  });

  it('clears auth state and rejects a business 401 only for the kubeconfig check', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { code: 401, message: 'Expired' } });
    await expect(checkSessionStatus('browser-kc')).rejects.toMatchObject({ code: 401 });
    expect(state.delSession).toHaveBeenCalledOnce();
    expect(state.setToken).toHaveBeenCalledWith('');
    expect(state.setGlobalToken).toHaveBeenCalledWith('');
    expect(clearSharedAuthCookie).toHaveBeenCalledOnce();
    expect(clearPersistedMarketingQuery).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith('/signin');
  });

  it('handles an HTTP 401 from the kubeconfig check', async () => {
    const error = { response: { status: 401 } };
    vi.spyOn(axios, 'post').mockRejectedValue(error);
    await expect(checkSessionStatus('browser-kc')).rejects.toBe(error);
    expect(clearSharedAuthCookie).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith('/signin');
  });

  it('does not clear auth state for an unavailable cluster', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { code: 503 } });
    await expect(checkSessionStatus('browser-kc')).rejects.toMatchObject({ code: 503 });
    expect(state.delSession).not.toHaveBeenCalled();
    expect(clearSharedAuthCookie).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('preserves the shared interceptor original business 401 behavior', async () => {
    await expect(
      request.get('/api/auth/userInfo', {
        adapter: async (config) => ({
          data: { code: 401, message: 'Expired' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        })
      })
    ).resolves.toBeUndefined();
    expect(state.delSession).toHaveBeenCalledOnce();
    expect(state.setToken).toHaveBeenCalledWith('');
    expect(state.setGlobalToken).not.toHaveBeenCalled();
    expect(clearSharedAuthCookie).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/signin');
  });

  it('preserves the shared interceptor original HTTP 401 behavior', async () => {
    const error = { response: { status: 401 } };
    await expect(
      request.get('/api/auth/userInfo', {
        adapter: async () => {
          throw error;
        }
      })
    ).rejects.toBe(error);
    expect(state.delSession).not.toHaveBeenCalled();
    expect(clearSharedAuthCookie).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
