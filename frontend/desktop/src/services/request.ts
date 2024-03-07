import useSessionStore from '@/stores/session';
import type { ApiResp } from '@/types';
import axios, { AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
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
    }

    if (!config.headers || config.headers['Content-Type'] === '') {
      _headers['Content-Type'] = 'application/json';
    }

    config.headers = _headers;
    return config;
  },
  (error) => {
    error.data = {};
    error.data.msg = '服务器异常，请联系管理员！';
    return Promise.resolve(error);
  }
);

// response interceptor
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const { status, data } = response;
    if (data.code === 401) {
      console.log('鉴权失败');
      useSessionStore.getState().delSession();
      useSessionStore.getState().setToken('');
      return window.location.replace('/signin');
    }
    if (status < 200 || status >= 300) {
      return Promise.reject(new Error(data?.code + ':' + data?.message));
    }

    const apiResp = data as ApiResp;
    if (apiResp?.code && (apiResp.code < 200 || apiResp.code >= 300)) {
      return Promise.reject({ code: apiResp.code, message: apiResp.message });
    }

    return data;
  },
  (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject('cancel request' + String(error));
    } else {
      error.errMessage = '请求超时或服务器异常，请检查网络或联系管理员！';
    }
    return Promise.reject(error);
  }
);

export default request;
