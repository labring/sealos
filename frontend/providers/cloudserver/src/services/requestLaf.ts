import axios, {
  AxiosHeaders,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig
} from 'axios';

/**
 * token from app headers improtant
 * ./request.ts
 */
const request = axios.create({
  baseURL: process.env.LAF_BASE_URL,
  withCredentials: true,
  timeout: 60000
});

// request interceptor
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    let _headers: AxiosHeaders = config.headers;

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
  (response: AxiosResponse) => {
    return response.data;
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
  return request.delete(url, {
    params: data,
    ...config
  });
}
