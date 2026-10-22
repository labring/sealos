import type { InternalAxiosRequestConfig } from 'axios';
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

const originalAdapter = request.defaults.adapter;
const respond = (data: unknown) => {
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config
  }));
  request.defaults.adapter = adapter;
  return adapter;
};

describe('kubeconfig check through the original shared interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { location: { replace } });
    state.isGuest.mockReturnValue(false);
  });
  afterEach(() => {
    request.defaults.adapter = originalAdapter;
    vi.unstubAllGlobals();
  });

  it('sends current kubeconfig and regional JWT through the shared client', async () => {
    const adapter = respond({ code: 200 });
    await expect(checkSessionStatus('browser-kc')).resolves.toEqual({ code: 200 });
    const config = adapter.mock.calls[0][0];
    expect(config.url).toBe('/api/auth/checkStatus');
    expect(JSON.parse(config.data)).toEqual({ kubeconfig: 'browser-kc' });
    expect(config.headers.Authorization).toBe('regional-token');
    expect(config.withCredentials).toBe(true);
    expect(config.timeout).toBe(20000);
    expect(state.delSession).not.toHaveBeenCalled();
  });

  it('uses the existing business 401 redirect and undefined return value', async () => {
    respond({ code: 401, message: 'Expired' });
    await expect(checkSessionStatus('browser-kc')).resolves.toBeUndefined();
    expect(state.delSession).toHaveBeenCalledOnce();
    expect(state.setToken).toHaveBeenCalledWith('');
    expect(clearPersistedMarketingQuery).toHaveBeenCalledOnce();
    expect(state.setGlobalToken).not.toHaveBeenCalled();
    expect(clearSharedAuthCookie).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/signin');
  });

  it('retains the original HTTP 401 rejection without adding logout behavior', async () => {
    const error = { response: { status: 401 } };
    request.defaults.adapter = async () => {
      throw error;
    };
    await expect(checkSessionStatus('browser-kc')).rejects.toBe(error);
    expect(state.delSession).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('does not clear auth state for an unavailable cluster', async () => {
    respond({ code: 503 });
    await expect(checkSessionStatus('browser-kc')).rejects.toMatchObject({ code: 503 });
    expect(state.delSession).not.toHaveBeenCalled();
    expect(clearSharedAuthCookie).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('preserves other API calls original business 401 behavior', async () => {
    respond({ code: 401, message: 'Expired' });
    await expect(request.get('/api/auth/userInfo')).resolves.toBeUndefined();
    expect(state.delSession).toHaveBeenCalledOnce();
    expect(state.setToken).toHaveBeenCalledWith('');
    expect(state.setGlobalToken).not.toHaveBeenCalled();
    expect(clearSharedAuthCookie).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/signin');
  });

  it('preserves other API calls original HTTP 401 behavior', async () => {
    const error = { response: { status: 401 } };
    request.defaults.adapter = async () => {
      throw error;
    };
    await expect(request.get('/api/auth/userInfo')).rejects.toBe(error);
    expect(state.delSession).not.toHaveBeenCalled();
    expect(clearSharedAuthCookie).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
