// http.ts
import { ApiResp } from '@/interfaces/api';
import useSessionStore from '@/stores/session';
import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosRequestHeaders } from 'axios';

const request = axios.create({
  baseURL: '/',
  withCredentials: true,
  timeout: 30000
});

// request interceptor
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // auto append service prefix
    let _headers: AxiosRequestHeaders = config.headers || {};
    const session = useSessionStore.getState().session;

    if (config.url && config.url?.startsWith('/api/')) {
      _headers['Authorization'] = encodeURIComponent(session?.kubeconfig || '');
    }

    if (process.env.NODE_ENV === 'development') {
      _headers['Authorization'] = encodeURIComponent(process.env.NEXT_PUBLIC_MOCK_KUBECONFIG || '');
    }

    if (!config.headers || config.headers['Content-Type'] === '') {
      _headers['Content-Type'] = 'application/json';
    }

    config.headers = _headers;
    return config;
  },
  (error) => {
    error.data = {};
    error.data.message = 'error';
    return Promise.resolve(error);
  }
);

// response interceptor
request.interceptors.response.use(
  (response: AxiosResponse<ApiResp>) => {
    const data = response.data as ApiResp;
    if (!data.code || data.code < 200 || data.code > 300) {
      return Promise.reject(response);
    }
    return response;
  },
  (error) => {
    if (!error) {
      return Promise.reject({ message: '未知错误' });
    }
    if (axios.isCancel(error)) {
      console.log('repeated request: ' + error.message);
    } else {
      error.data = {};
      error.data.message = 'error';
    }
    return Promise.reject(error);
  }
);

export default request;
