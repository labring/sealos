import useSessionStore from '@/stores/session';
import { clearPersistedMarketingQuery } from '@/utils/marketing-attribution';
import type { ApiResp } from '@/types';
import axios, { AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import {
  clearWebCredentials,
  recoverWebSession,
  webSessionContext,
  type WebSessionContext
} from './web-session';
type SessionRequest = InternalAxiosRequestConfig & {
  webContext?: WebSessionContext;
  webRetried?: boolean;
};
const request = axios.create({
  baseURL: '/',
  withCredentials: true,
  timeout: 20000
});

// request interceptor
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    let _headers: AxiosHeaders = config.headers || {};

    const token = useSessionStore.getState().token;
    if (token && config.url && config.url?.startsWith('/api/')) {
      _headers['Authorization'] = encodeURIComponent(token);
      (config as SessionRequest).webContext = webSessionContext();
    }

    if (!config.headers || config.headers['Content-Type'] === '') {
      _headers['Content-Type'] = 'application/json';
    }

    config.headers = _headers;
    return config;
  },
  (error) => {
    error.data = {};
    error.data.msg = 'Server abnormality, please contact the administrator!';
    return Promise.resolve(error);
  }
);

// response interceptor
request.interceptors.response.use(
  async (response: AxiosResponse) => {
    const { status, data } = response;
    const isGuest = useSessionStore.getState().isGuest();
    // console.log(data, 'data', isGuest);
    if (data.code === 401 && !isGuest) {
      const recovered = await recoverRequest(response.config as SessionRequest);
      if (recovered) return recovered;
      console.log('鉴权失败');
      console.log(data.message);
      clearPersistedMarketingQuery();
      useSessionStore.getState().delSession();
      useSessionStore.getState().setToken('');
      return window.location.replace('/signin');
    }
    if (status < 200 || status >= 300) {
      return Promise.reject(new Error(data?.code + ':' + data?.message));
    }

    const apiResp = data as ApiResp;
    if (apiResp?.code && (apiResp.code < 200 || apiResp.code >= 300)) {
      return Promise.reject({ code: apiResp.code, message: apiResp.message, data: apiResp.data });
    }

    return data;
  },
  async (error) => {
    if (error.response?.status === 401 && !useSessionStore.getState().isGuest()) {
      const config = error.config as SessionRequest | undefined;
      if (config?.webContext) {
        const recovered = await recoverRequest(config);
        if (recovered) return recovered;
      }
    }
    if (axios.isCancel(error)) {
      return Promise.reject('cancel request' + String(error));
    } else {
      error.errMessage = 'Server abnormality, please contact the administrator!';
    }
    return Promise.reject(error);
  }
);

async function recoverRequest(config: SessionRequest): Promise<any> {
  if (!config.webContext) return undefined;
  const current = webSessionContext();
  if (
    !current ||
    current.userUid !== config.webContext.userUid ||
    current.workspaceUid !== config.webContext.workspaceUid
  )
    throw { code: 409, message: 'Session context changed' };
  if (config.webRetried) {
    if (current.token !== config.webContext.token)
      throw { code: 409, message: 'Session context changed' };
    // 有效续期之后仍被某个 API 拒绝，不等于长期会话失效。
    throw { code: 401, message: 'Request remains unauthorized after session renewal' };
  }
  const result = await recoverWebSession(config.webContext);
  if (result === 'expired') {
    clearWebCredentials();
    window.location.replace('/signin');
    throw { code: 401, message: 'Authentication required' };
  }
  if (result !== 'refreshed')
    throw {
      code: result === 'context_changed' ? 409 : 503,
      message: 'Session recovery unavailable'
    };
  const readOnly =
    ['get', 'head', 'options'].includes(config.method?.toLowerCase() || 'get') ||
    config.url === '/api/auth/checkStatus';
  // 写请求只恢复凭证并返回明确失败，不自动重放，避免重复部署、付款或删除。
  if (!readOnly) throw { code: 409, message: 'Session renewed. Retry this operation.' };
  config.webRetried = true;
  if (config.url === '/api/auth/checkStatus')
    config.data = JSON.stringify({
      kubeconfig: useSessionStore.getState().session?.kubeconfig || ''
    });
  return request.request(config);
}

export default request;
