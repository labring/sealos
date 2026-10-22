import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { state, clearSharedAuthCookie, clearPersistedMarketingQuery, replace } = vi.hoisted(() => ({
  state: { isGuest: vi.fn(), delSession: vi.fn(), setToken: vi.fn(), setGlobalToken: vi.fn() },
  clearSharedAuthCookie: vi.fn(),
  clearPersistedMarketingQuery: vi.fn(),
  replace: vi.fn()
}));
vi.mock('@/stores/session', () => ({ default: { getState: () => state } }));
vi.mock('@/utils/cookieUtils', () => ({ clearSharedAuthCookie }));
vi.mock('@/utils/marketing-attribution', () => ({ clearPersistedMarketingQuery }));

import request from '@/services/request';

describe('session expiry through the shared request interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { location: { replace } });
    state.isGuest.mockReturnValue(false);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('clears all auth state and rejects a business 401', async () => {
    await expect(
      request.post(
        '/api/auth/checkStatus',
        {},
        {
          adapter: async (config) => ({
            data: { code: 401, message: 'Expired' },
            status: 200,
            statusText: 'OK',
            headers: {},
            config
          })
        }
      )
    ).rejects.toMatchObject({ code: 401 });
    expect(state.delSession).toHaveBeenCalledOnce();
    expect(state.setToken).toHaveBeenCalledWith('');
    expect(state.setGlobalToken).toHaveBeenCalledWith('');
    expect(clearSharedAuthCookie).toHaveBeenCalledOnce();
    expect(clearPersistedMarketingQuery).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith('/signin');
  });

  it('also handles an actual HTTP 401', async () => {
    const error = { response: { status: 401 } };
    await expect(
      request.get('/api/auth/checkStatus', {
        adapter: async () => {
          throw error;
        }
      })
    ).rejects.toBe(error);
    expect(clearSharedAuthCookie).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith('/signin');
  });

  it('does not clear auth state for an unavailable cluster', async () => {
    await expect(
      request.post(
        '/api/auth/checkStatus',
        {},
        {
          adapter: async (config) => ({
            data: { code: 503 },
            status: 200,
            statusText: 'OK',
            headers: {},
            config
          })
        }
      )
    ).rejects.toMatchObject({ code: 503 });
    expect(state.delSession).not.toHaveBeenCalled();
    expect(clearSharedAuthCookie).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
