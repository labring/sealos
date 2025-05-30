import axios, {
  InternalAxiosRequestConfig,
  AxiosHeaders,
  AxiosResponse,
  AxiosRequestConfig
} from 'axios';
import { getUserKubeConfig } from '@/utils/user';
import { ApiResponse, ResponseCode } from '@/types/response';

const request = axios.create({
  baseURL: '/',
  withCredentials: true,
  timeout: 60000
});

// request interceptor
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (config.url && !config.url?.startsWith('/api/')) {
      config.url = '' + config.url;
    }
    let _headers: AxiosHeaders = config.headers;

    _headers['Authorization'] = config.headers.Authorization
      ? config.headers.Authorization
      : encodeURIComponent(getUserKubeConfig());
    if (!config.headers || config.headers['Content-Type'] === '') {
      _headers['Content-Type'] = 'application/json';
    }

    config.headers = _headers;
    return config;
  },
  (error: any) => {
    error.data = {};
    error.data.msg = 'Server abnormality, please contact the administrator!';
    return Promise.resolve(error);
  }
);

// response interceptor
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { status, data } = response;
    if (status < 200 || status >= 300) {
      return Promise.reject({
        code: status,
        message: `HTTP Error: ${status}`
      });
    }

    if (data.code !== ResponseCode.SUCCESS) {
      return Promise.reject(data);
    }

    return data.data;
  },
  (error: any) => {
    if (axios.isCancel(error)) {
      return Promise.reject('cancel request' + String(error));
    } else {
      error.errMessage = 'Server abnormality, please contact the administrator!';
    }
    return Promise.reject(error);
  }
);

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
  return request.get(url, {
    params: data,
    ...config
  });
}
