import axios, {
  InternalAxiosRequestConfig,
  AxiosHeaders,
  AxiosRequestConfig,
  AxiosResponse
} from 'axios';
import { getUserKubeConfig } from '@/utils/user';
import { isSuccessResponse } from '@/utils/types';
import { ErrnoCode, buildErrno } from './backend/error';

const request = axios.create({
  baseURL: '/',
  withCredentials: true,
  timeout: 60000
});

// request interceptor
request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // auto append service prefix
  if (config.url && !config.url?.startsWith('/api/')) {
    config.url = '' + config.url;
  }
  let _headers: AxiosHeaders = config.headers;

  //获取token，并将其添加至请求头中
  _headers['Authorization'] = encodeURIComponent(getUserKubeConfig());
  if (!config.headers || config.headers['Content-Type'] === '') {
    _headers['Content-Type'] = 'application/json';
  }

  config.headers = _headers;
  return config;
});

request.interceptors.response.use((response: AxiosResponse) => {
  const { data } = response;

  if (!isSuccessResponse(data))
    return Promise.reject(
      buildErrno('Response is not correct type', ErrnoCode.ServerInternalError)
    );

  return response.data;
});

export function GET<T = any>(
  url: string,
  data?: { [key: string]: any },
  config?: AxiosRequestConfig
): Promise<T> {
  return request.get(url, {
    params: data,
    ...config
  });
}

export function POST<T = any>(
  url: string,
  data?: { [key: string]: any },
  config?: AxiosRequestConfig
): Promise<T> {
  return request.post(url, data, config);
}

export function DELETE<T = any>(
  url: string,
  data?: { [key: string]: any },
  config?: AxiosRequestConfig
): Promise<T> {
  return request.delete(url, {
    params: data,
    ...config
  });
}

export function PUT<T = any>(
  url: string,
  data?: { [key: string]: any },
  config?: AxiosRequestConfig
): Promise<T> {
  return request.put(url, data, config);
}
