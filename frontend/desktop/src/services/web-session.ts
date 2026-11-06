import axios from 'axios';
import useSessionStore from '@/stores/session';
import { clearSharedAuthCookie } from '@/utils/cookieUtils';
import { clearPersistedMarketingQuery } from '@/utils/marketing-attribution';
import type { WebSessionCredentials } from '@/types/web-session';

export type WebSessionContext = {
  userUid: string;
  workspaceUid: string;
  token: string;
  generation: number;
};
export type WebSessionRecovery = 'refreshed' | 'expired' | 'unavailable' | 'context_changed';
let inflight: { generation: number; promise: Promise<WebSessionRecovery> } | undefined;
let generation = 0;
let configuring = false;

export const beginSessionConfiguration = () => {
  const { session, token, globalToken } = useSessionStore.getState();
  configuring = true;
  return { generation: ++generation, session, token, globalToken };
};
export const isSessionConfigurationCurrent = (
  operation: ReturnType<typeof beginSessionConfiguration>
) => {
  const state = useSessionStore.getState();
  return (
    operation.generation === generation &&
    operation.session === state.session &&
    operation.token === state.token &&
    operation.globalToken === state.globalToken
  );
};
export const endSessionConfiguration = (
  operation: ReturnType<typeof beginSessionConfiguration>
) => {
  if (operation.generation !== generation) return;
  configuring = false;
  generation++;
};

export const webSessionContext = (): WebSessionContext | undefined => {
  const { session, token } = useSessionStore.getState();
  const user = session?.user;
  return user?.userUid && user.ns_uid
    ? { userUid: user.userUid, workspaceUid: user.ns_uid, token, generation }
    : undefined;
};
const sameContext = (expected: WebSessionContext) => {
  const current = webSessionContext();
  return (
    !configuring &&
    current?.userUid === expected.userUid &&
    current.workspaceUid === expected.workspaceUid &&
    current.generation === expected.generation
  );
};

export const establishWebSession = async (globalToken?: string) => {
  if (!globalToken) return;
  try {
    await axios.post(
      '/api/auth/session',
      {},
      {
        withCredentials: true,
        timeout: 20000,
        headers: {
          'Content-Type': 'application/json',
          Authorization: encodeURIComponent(globalToken)
        }
      }
    );
  } catch (error) {
    // 登录入口会记录初始化错误；不能泄露带 Authorization 的 Axios config。
    throw {
      code: axios.isAxiosError(error) ? error.response?.status || 503 : 503,
      message: 'Unable to establish login session'
    };
  }
};

export const recoverWebSession = async (
  expected: WebSessionContext
): Promise<WebSessionRecovery> => {
  if (!sameContext(expected)) return 'context_changed';
  // 迟到的旧凭证 401 复用已经恢复的状态，不能再创建第二次续期。
  if (useSessionStore.getState().token !== expected.token) return 'refreshed';
  if (inflight?.generation === expected.generation) {
    const result = await inflight.promise;
    if (!sameContext(expected)) return 'context_changed';
    if (useSessionStore.getState().token !== expected.token) return 'refreshed';
    return result;
  }
  const promise = (async (): Promise<WebSessionRecovery> => {
    try {
      // 使用无拦截器的请求，避免 refresh 的认证失败递归触发自身。
      const response = await axios.post(
        '/api/auth/session/refresh',
        { workspaceUid: expected.workspaceUid },
        {
          withCredentials: true,
          timeout: 20000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      if (!sameContext(expected)) return 'context_changed';
      if (useSessionStore.getState().token !== expected.token) return 'refreshed';
      if (response.data?.code === 401) return 'expired';
      if (response.data?.code !== 200) return 'unavailable';
      const data = response.data.data as WebSessionCredentials;
      if (!data || data.userUid !== expected.userUid || data.workspaceUid !== expected.workspaceUid)
        return 'context_changed';
      if (
        ![data.globalToken, data.token, data.appToken, data.kubeconfig].every(
          (v) => typeof v === 'string' && v.length > 0
        )
      )
        return 'unavailable';
      return useSessionStore.getState().applyRenewedCredentials(data)
        ? 'refreshed'
        : 'context_changed';
    } catch (error) {
      if (!sameContext(expected)) return 'context_changed';
      if (useSessionStore.getState().token !== expected.token) return 'refreshed';
      return axios.isAxiosError(error) && error.response?.status === 401
        ? 'expired'
        : 'unavailable';
    }
  })();
  inflight = { generation: expected.generation, promise };
  try {
    return await promise;
  } finally {
    if (inflight?.promise === promise) inflight = undefined;
  }
};

export const clearWebCredentials = () => {
  generation++;
  configuring = false;
  clearPersistedMarketingQuery();
  const store = useSessionStore.getState();
  store.delSession();
  store.setGlobalToken('');
  store.setToken('');
  clearSharedAuthCookie();
};

export const revokeWebSession = () =>
  axios.post(
    '/api/auth/session/logout',
    {},
    {
      withCredentials: true,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    }
  );
