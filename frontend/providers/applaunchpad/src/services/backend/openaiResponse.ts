import { NextApiResponse } from 'next';
import { openaiError, proxyError } from '../error';

export interface ResponseType<T = any> {
  code: number;
  message: string;
  data: T;
}

export const openaiResponse = <T = any>(
  res: NextApiResponse,
  props?: {
    code?: number;
    message?: string;
    data?: T;
    error?: any;
  }
) => {
  const { code = 200, message = '', data = null, error } = props || {};

  let msg = message;
  if ((code < 200 || code >= 400) && !message) {
    msg = error?.message || '请求错误';
    if (typeof error === 'string') {
      msg = error;
    } else if (proxyError[error?.code]) {
      msg = '服务器代理出错';
    } else if (openaiError[error?.response?.statusText]) {
      msg = openaiError[error.response.statusText];
    }
    console.log('error->');
    console.log('code:', error.code);
    console.log('statusText:', error?.response?.statusText);
    console.log('msg:', msg);
  }

  res.json({
    code,
    message: msg,
    data
  });
};
