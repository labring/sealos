import useSessionStore from '@/stores/session';
import { clearPersistedMarketingQuery } from '@/utils/marketing-attribution';
import { clearSharedAuthCookie } from '@/utils/cookieUtils';
import type { ApiResp } from '@/types';
import axios, { AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
const request = axios.create({
  baseURL: '/',
  withCredentials: true,
  timeout: 20000
});

const expireSession = () => {
  clearPersistedMarketingQuery();
  const store = useSessionStore.getState();
  store.delSession();
  store.setGlobalToken('');
  store.setToken('');
  clearSharedAuthCookie();
  window.location.replace('/signin');
};

// request interceptor
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    let _headers: AxiosHeaders = config.headers || {};

    const token = useSessionStore.getState().token;
    if (token && config.url && config.url?.startsWith('/api/')) {
      _headers['Authorization'] = encodeURIComponent(token);
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
  (response: AxiosResponse) => {
    const { status, data } = response;
    const isGuest = useSessionStore.getState().isGuest();
    // console.log(data, 'data', isGuest);
    if (data.code === 401 && !isGuest) {
      expireSession();
      return Promise.reject({ code: 401, message: data.message });
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
  (error) => {
    if (error.response?.status === 401 && !useSessionStore.getState().isGuest()) {
      expireSession();
    }
    if (axios.isCancel(error)) {
      return Promise.reject('cancel request' + String(error));
    } else {
      error.errMessage = 'Server abnormality, please contact the administrator!';
    }
    return Promise.reject(error);
  }
);

export default request;
