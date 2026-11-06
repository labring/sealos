import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jwtDecode } from 'jwt-decode';
import { loginSessionConfig, sessionConfig } from '@/utils/sessionConfig';
import useSessionStore from '@/stores/session';
import request from '@/services/request';
import { clearWebCredentials } from '@/services/web-session';

vi.mock('@/utils/cookieUtils', () => ({
  setSharedAuthCookie: vi.fn(),
  clearSharedAuthCookie: vi.fn()
}));
vi.mock('@/utils/app-visitor-link', () => ({ clearWebAnalyticsIdentity: vi.fn() }));
vi.mock('@/utils/marketing-attribution', () => ({ clearPersistedMarketingQuery: vi.fn() }));
const storage = vi.hoisted(() => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    clear: () => values.clear()
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  return storage;
});

const uid = 'alice';
const payload = (workspace: string) => ({
  userUid: uid,
  userId: '1',
  userCrUid: 'cr',
  userCrName: 'alice',
  regionUid: 'region',
  workspaceUid: workspace,
  workspaceId: `ns-${workspace}`
});
const token = (workspace: string, version = '') =>
  `e30.${Buffer.from(JSON.stringify({ ...payload(workspace), version })).toString(
    'base64url'
  )}.test`;
const credentials = (workspace: string) => ({
  token: token(workspace),
  appToken: `app-${workspace}`,
  kubeconfig: `kc-${workspace}`
});
const session = (workspace: string) =>
  ({
    user: { userUid: uid, ns_uid: workspace, nsid: `ns-${workspace}` },
    token: `app-${workspace}`,
    kubeconfig: `kc-${workspace}`,
    subscription: null
  } as any);
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const info = { code: 200, data: { info: { nickname: 'Alice', oauthProvider: [] } } };
const plan = { code: 200, data: { subscription: { PlanName: 'test' } } };
const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200) => ({
  config,
  data,
  status,
  statusText: String(status),
  headers: {}
});
const originalAdapter = axios.defaults.adapter;
const originalSharedAdapter = request.defaults.adapter;

describe('real session configuration and renewal transitions', () => {
  let hold: ReturnType<typeof deferred<typeof info>>;
  let started: ReturnType<typeof deferred<void>>;
  let bootstrapCalls: number;
  let refreshCalls: number;
  let rejectBootstrap: boolean;
  let metadataTokens: string[];

  beforeEach(() => {
    bootstrapCalls = 0;
    refreshCalls = 0;
    rejectBootstrap = false;
    metadataTokens = [];
    storage.clear();
    hold = deferred<typeof info>();
    started = deferred<void>();
    vi.stubGlobal('window', { location: { replace: vi.fn() } });
    useSessionStore.setState({
      session: session('A'),
      token: token('A'),
      globalToken: 'login-proof'
    });
    const adapter = async (config: InternalAxiosRequestConfig) => {
      if (config.url === '/api/auth/session') {
        bootstrapCalls++;
        if (rejectBootstrap)
          throw new AxiosError(
            'Expired proof',
            undefined,
            config,
            undefined,
            response(config, { code: 401 }, 401)
          );
        return response(config, { code: 200, data: null });
      }
      if (config.url === '/api/auth/info') {
        metadataTokens.push(String(config.headers.Authorization));
        started.resolve();
        return response(config, await hold.promise);
      }
      if (config.url === '/api/plan/info') return response(config, plan);
      if (config.url === '/api/auth/session/refresh') {
        refreshCalls++;
        const workspace = JSON.parse(config.data).workspaceUid;
        return response(config, {
          code: 200,
          data: {
            userUid: uid,
            workspaceUid: workspace,
            token: token(workspace, 'renewed'),
            appToken: `renewed-app-${workspace}`,
            kubeconfig: `renewed-kc-${workspace}`,
            globalToken: 'renewed-global'
          }
        });
      }
      if (config.url === '/api/auth/checkStatus')
        return response(config, {
          code: (config as InternalAxiosRequestConfig & { webRetried?: boolean }).webRetried
            ? 200
            : 401
        });
      throw new Error(`Unexpected test request: ${config.url}`);
    };
    axios.defaults.adapter = adapter;
    request.defaults.adapter = adapter;
  });
  afterEach(() => {
    axios.defaults.adapter = originalAdapter;
    request.defaults.adapter = originalSharedAdapter;
    vi.unstubAllGlobals();
  });

  it('switches workspace with an expired global proof without bootstrapping the login again', async () => {
    rejectBootstrap = true;
    hold.resolve(info);
    await sessionConfig(credentials('B'));
    expect(bootstrapCalls).toBe(0);
    expect(useSessionStore.getState().token).toBe(token('B'));
    expect(useSessionStore.getState().session?.user?.ns_uid).toBe('B');
  });

  it('keeps credentials coherent while configuration awaits metadata and a new request gets 401', async () => {
    const observed: string[] = [];
    const unsubscribe = useSessionStore.subscribe((state) => {
      if (state.session?.user && state.token)
        observed.push(`${jwtDecode<any>(state.token).workspaceUid}:${state.session.user.ns_uid}`);
    });
    try {
      const configuring = sessionConfig(credentials('B'));
      await started.promise;
      expect(useSessionStore.getState().token).toBe(token('A'));
      expect(metadataTokens).toEqual([encodeURIComponent(token('B'))]);
      const checked = await request
        .post('/api/auth/checkStatus', { kubeconfig: 'old-kc' })
        .catch((error) => ({ code: error.code }));
      hold.resolve(info);
      await configuring;
      const current = useSessionStore.getState();
      expect(current.token).toBe(token('B'));
      expect(current.session).toMatchObject({
        user: { ns_uid: 'B' },
        token: 'app-B',
        kubeconfig: 'kc-B'
      });
      expect(observed.every((value) => value === 'A:A' || value === 'B:B')).toBe(true);
      expect(checked).toEqual({ code: 409 });
      expect(refreshCalls).toBe(0);
      const persisted = JSON.parse(storage.getItem('session')!).state;
      expect(jwtDecode<any>(persisted.token).workspaceUid).toBe('B');
      expect(persisted.session).toMatchObject({
        user: { ns_uid: 'B' },
        token: 'app-B',
        kubeconfig: 'kc-B'
      });
    } finally {
      unsubscribe();
    }
  });

  it('does not restore a session after logout while metadata is pending', async () => {
    const configuring = sessionConfig(credentials('B'));
    await started.promise;
    clearWebCredentials();
    const rejected = expect(configuring).rejects.toMatchObject({ code: 409 });
    hold.resolve(info);
    await rejected;
    expect(useSessionStore.getState().session).toBeUndefined();
    expect(useSessionStore.getState().token).toBe('');
  });

  it('preserves the previous complete session when metadata cannot be loaded', async () => {
    const before = useSessionStore.getState();
    const configuring = sessionConfig(credentials('B'));
    await started.promise;
    const rejected = expect(configuring).rejects.toBeDefined();
    hold.reject(new Error('temporarily unavailable'));
    await rejected;
    expect(useSessionStore.getState().token).toBe(before.token);
    expect(useSessionStore.getState().session).toBe(before.session);
    await expect(request.post('/api/auth/checkStatus', { kubeconfig: 'old-kc' })).resolves.toEqual({
      code: 200
    });
    expect(refreshCalls).toBe(1);
  });

  it('establishes the persistent session at the explicit login entrypoint', async () => {
    hold.resolve(info);
    await loginSessionConfig(credentials('B'));
    expect(bootstrapCalls).toBe(1);
    expect(useSessionStore.getState().session?.user?.ns_uid).toBe('B');
  });

  it('still rejects an expired proof at the login entrypoint without changing credentials', async () => {
    rejectBootstrap = true;
    const before = useSessionStore.getState();
    await expect(loginSessionConfig(credentials('B'))).rejects.toMatchObject({ code: 401 });
    expect(bootstrapCalls).toBe(1);
    expect(metadataTokens).toHaveLength(0);
    expect(useSessionStore.getState().token).toBe(before.token);
    expect(useSessionStore.getState().session).toBe(before.session);
  });

  it('discards a renewal started before workspace configuration', async () => {
    const renewing = deferred<any>();
    const renewalStarted = deferred<void>();
    const baseAdapter = axios.defaults.adapter as (
      config: InternalAxiosRequestConfig
    ) => Promise<any>;
    axios.defaults.adapter = async (config) => {
      if (config.url !== '/api/auth/session/refresh') return baseAdapter(config);
      renewalStarted.resolve();
      await renewing.promise;
      return baseAdapter(config);
    };
    const oldRequest = request
      .post('/api/auth/checkStatus', { kubeconfig: 'old-kc' })
      .catch((error) => ({ code: error.code }));
    await renewalStarted.promise;
    const configuring = sessionConfig(credentials('B'));
    await started.promise;
    renewing.resolve(null);
    expect(await oldRequest).toEqual({ code: 409 });
    expect(useSessionStore.getState().token).toBe(token('A'));
    hold.resolve(info);
    await configuring;
    expect(useSessionStore.getState().token).toBe(token('B'));
    expect(useSessionStore.getState().session?.user?.ns_uid).toBe('B');
  });

  it('keeps the newest workspace when two configurations complete in reverse order', async () => {
    const baseAdapter = axios.defaults.adapter as (
      config: InternalAxiosRequestConfig
    ) => Promise<any>;
    axios.defaults.adapter = async (config) =>
      config.url === '/api/auth/info' &&
      config.headers.Authorization === encodeURIComponent(token('C'))
        ? response(config, info)
        : baseAdapter(config);
    const older = sessionConfig(credentials('B'));
    await started.promise;
    await sessionConfig(credentials('C'));
    const rejected = expect(older).rejects.toMatchObject({ code: 409 });
    hold.resolve(info);
    await rejected;
    expect(useSessionStore.getState().token).toBe(token('C'));
    expect(useSessionStore.getState().session).toMatchObject({
      user: { ns_uid: 'C' },
      token: 'app-C',
      kubeconfig: 'kc-C'
    });
  });

  it('does not let an old renewal clear the new generation single-flight owner', async () => {
    const oldRefresh = deferred<void>(),
      newRefresh = deferred<void>();
    const oldStarted = deferred<void>(),
      newStarted = deferred<void>();
    const baseAdapter = axios.defaults.adapter as (
      config: InternalAxiosRequestConfig
    ) => Promise<any>;
    const workspaces: string[] = [];
    axios.defaults.adapter = async (config) => {
      if (config.url === '/api/auth/session/refresh') {
        const workspace = JSON.parse(config.data).workspaceUid;
        workspaces.push(workspace);
        if (workspace === 'A') {
          oldStarted.resolve();
          await oldRefresh.promise;
        } else {
          newStarted.resolve();
          await newRefresh.promise;
        }
      }
      return baseAdapter(config);
    };
    const oldRequest = request
      .post('/api/auth/checkStatus', { kubeconfig: 'old-kc' })
      .catch((error) => ({ code: error.code }));
    await oldStarted.promise;
    hold.resolve(info);
    await sessionConfig(credentials('B'));
    const first = request.post('/api/auth/checkStatus', { kubeconfig: 'old-kc' });
    await newStarted.promise;
    oldRefresh.resolve();
    expect(await oldRequest).toEqual({ code: 409 });
    const second = request.post('/api/auth/checkStatus', { kubeconfig: 'old-kc' });
    newRefresh.resolve();
    await expect(Promise.all([first, second])).resolves.toEqual([{ code: 200 }, { code: 200 }]);
    expect(workspaces).toEqual(['A', 'B']);
    expect(useSessionStore.getState().session?.user?.ns_uid).toBe('B');
  });
});
