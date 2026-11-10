import axios, { type InternalAxiosRequestConfig } from 'axios';
import { checkSessionStatus } from '@/api/auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { state, clearSharedAuthCookie, clearPersistedMarketingQuery, replace } = vi.hoisted(() => ({
  state: {
    token: 'regional-token',
    session: undefined as any,
    applyRenewedCredentials: vi.fn(),
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
import { establishWebSession } from '@/services/web-session';

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
const loggedIn = () => {
  state.session = { user: { userUid: 'alice', ns_uid: 'workspace' }, kubeconfig: 'old-kc' };
  state.applyRenewedCredentials.mockImplementation((credentials) => {
    state.token = credentials.token;
    state.session.kubeconfig = credentials.kubeconfig;
    return true;
  });
};
const renewed = {
  data: {
    code: 200,
    data: {
      userUid: 'alice',
      workspaceUid: 'workspace',
      globalToken: 'global-new',
      token: 'regional-new',
      appToken: 'app-new',
      kubeconfig: 'new-kc'
    }
  }
};

describe('kubeconfig check through the original shared interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { location: { replace } });
    state.isGuest.mockReturnValue(false);
    state.token = 'regional-token';
    state.session = undefined;
  });
  afterEach(() => {
    request.defaults.adapter = originalAdapter;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('recovers expired credentials before redirecting an authenticated user', async () => {
    state.session = { user: { userUid: 'alice', ns_uid: 'workspace' }, kubeconfig: 'old-kc' };
    state.applyRenewedCredentials.mockImplementation((credentials) => {
      state.token = credentials.token;
      state.session.kubeconfig = credentials.kubeconfig;
      return true;
    });
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        code: 200,
        data: {
          userUid: 'alice',
          workspaceUid: 'workspace',
          globalToken: 'global-new',
          token: 'regional-new',
          appToken: 'app-new',
          kubeconfig: 'new-kc'
        }
      }
    });
    const requests: InternalAxiosRequestConfig[] = [];
    request.defaults.adapter = async (config) => {
      requests.push(config);
      return {
        data: requests.length === 1 ? { code: 401, message: 'Expired' } : { code: 200 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    };

    await expect(checkSessionStatus('old-kc')).resolves.toEqual({ code: 200 });
    expect(refresh).toHaveBeenCalledOnce();
    expect(requests).toHaveLength(2);
    expect(requests[1].headers.Authorization).toBe('regional-new');
    expect(JSON.parse(requests[1].data)).toEqual({ kubeconfig: 'new-kc' });
    expect(state.delSession).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('recovers a real HTTP 401 and retries only once', async () => {
    loggedIn();
    vi.spyOn(axios, 'post').mockResolvedValue(renewed);
    let calls = 0;
    request.defaults.adapter = async (config) => {
      if (++calls === 1)
        throw new axios.AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
          status: 401,
          statusText: 'Unauthorized',
          data: {},
          headers: {},
          config
        });
      return { data: { code: 200 }, status: 200, statusText: 'OK', headers: {}, config };
    };
    await expect(request.get('/api/auth/userInfo')).resolves.toEqual({ code: 200 });
    expect(calls).toBe(2);
    expect(replace).not.toHaveBeenCalled();
  });

  it('does not automatically replay a write after renewing credentials', async () => {
    loggedIn();
    vi.spyOn(axios, 'post').mockResolvedValue(renewed);
    const adapter = respond({ code: 401 });
    await expect(request.post('/api/deploy', { name: 'once' })).rejects.toMatchObject({
      code: 409
    });
    expect(adapter).toHaveBeenCalledOnce();
    expect(state.token).toBe('regional-new');
    expect(replace).not.toHaveBeenCalled();
  });

  it.each([403, 503, undefined])('keeps the account when renewal fails with %s', async (status) => {
    loggedIn();
    vi.spyOn(axios, 'post').mockRejectedValue(
      new axios.AxiosError(
        'Unavailable',
        undefined,
        undefined,
        undefined,
        status
          ? {
              status,
              statusText: 'Error',
              data: {},
              headers: {},
              config: {} as InternalAxiosRequestConfig
            }
          : undefined
      )
    );
    respond({ code: 401 });
    await expect(checkSessionStatus('old-kc')).rejects.toMatchObject({ code: 503 });
    expect(state.delSession).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('clears all local credentials only when the persistent session is rejected', async () => {
    loggedIn();
    vi.spyOn(axios, 'post').mockRejectedValue(
      new axios.AxiosError('Unauthorized', undefined, undefined, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        data: {},
        headers: {},
        config: {} as InternalAxiosRequestConfig
      })
    );
    respond({ code: 401 });
    await expect(checkSessionStatus('old-kc')).rejects.toMatchObject({ code: 401 });
    expect(state.delSession).toHaveBeenCalledOnce();
    expect(state.setToken).toHaveBeenCalledWith('');
    expect(state.setGlobalToken).toHaveBeenCalledWith('');
    expect(clearSharedAuthCookie).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith('/signin');
  });

  it('does not discard a valid session if the retried endpoint still denies access', async () => {
    loggedIn();
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue(renewed);
    const adapter = respond({ code: 401 });
    await expect(checkSessionStatus('old-kc')).rejects.toMatchObject({ code: 401 });
    expect(refresh).toHaveBeenCalledOnce();
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(state.delSession).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it.each(['logout', 'account', 'workspace'])(
    'discards a late renewal after %s',
    async (change) => {
      loggedIn();
      let finish!: (value: typeof renewed) => void;
      let started!: () => void;
      const pending = new Promise<void>((resolve) => {
        started = resolve;
      });
      vi.spyOn(axios, 'post').mockImplementation(() => {
        started();
        return new Promise((resolve) => {
          finish = resolve;
        });
      });
      respond({ code: 401 });
      const result = expect(checkSessionStatus('old-kc')).rejects.toMatchObject({ code: 409 });
      await pending;
      if (change === 'logout') state.session = undefined;
      else if (change === 'account') state.session.user.userUid = 'bob';
      else state.session.user.ns_uid = 'another-workspace';
      finish(renewed);
      await result;
      expect(state.applyRenewedCredentials).not.toHaveBeenCalled();
      expect(replace).not.toHaveBeenCalled();
    }
  );

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

  it('does not expose the login proof in bootstrap errors handled by login screens', async () => {
    const config = { headers: { Authorization: 'secret-proof' } } as InternalAxiosRequestConfig;
    vi.spyOn(axios, 'post').mockRejectedValue(
      new axios.AxiosError('Network error', undefined, config)
    );
    let caught: unknown;
    try {
      await establishWebSession('secret-proof');
    } catch (error) {
      caught = error;
    }
    expect(caught).toEqual({ code: 503, message: 'Unable to establish login session' });
    expect(JSON.stringify(caught)).not.toContain('secret-proof');
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
