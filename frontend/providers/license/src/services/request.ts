import { getUserKubeConfig } from '@/utils/user';
import axios, {
  AxiosHeaders,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig
} from 'axios';
import type { ApiResp } from './kubernet';
import { isApiResp } from './kubernet';

const showStatus = (status: number) => {
  let message = '';
  switch (status) {
    case 400:
      message = '请求错误(400)';
      break;
    case 401:
      message = '未授权，请重新登录(401)';
      break;
    case 403:
      message = '拒绝访问(403)';
      break;
    case 404:
      message = '请求出错(404)';
      break;
    case 408:
      message = '请求超时(408)';
      break;
    case 500:
      message = '服务器错误(500)';
      break;
    case 501:
      message = '服务未实现(501)';
      break;
    case 502:
      message = '网络错误(502)';
      break;
    case 503:
      message = '服务不可用(503)';
      break;
    case 504:
      message = '网络超时(504)';
      break;
    case 505:
      message = 'HTTP版本不受支持(505)';
      break;
    default:
      message = `连接出错(${status})!`;
  }
  return `${message}，请检查网络或联系管理员！`;
};

const request = axios.create({
  baseURL: '/',
  withCredentials: true,
  timeout: 60000
});

// request interceptor
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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
  },
  (error: any) => {
    error.data = {};
    error.data.msg = '服务器异常，请联系管理员！';
    return Promise.resolve(error);
  }
);

// response interceptor
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const { status, data } = response;

    if (status < 200 || status >= 300 || !isApiResp(data)) {
      return Promise.reject(
        status + ':' + showStatus(status) + ', ' + typeof data === 'string' ? data : String(data)
      );
    }

    const apiResp = data as ApiResp;
    if (apiResp.code < 200 || apiResp.code >= 400) {
      return Promise.reject(apiResp);
    }

    response.data = apiResp.data;
    return response.data;
  },
  (error: any) => {
    if (axios.isCancel(error)) {
      return Promise.reject('cancel request' + String(error));
    } else {
      error.errMessage = '请求超时或服务器异常，请检查网络或联系管理员！';
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
