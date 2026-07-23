import { NextApiResponse } from 'next';
import { ERROR_TEXT, ERROR_RESPONSE } from '../error';

export const jsonRes = <T = any>(
  res: NextApiResponse,
  props?: {
    code?: number;
    message?: string;
    data?: T;
    error?: any;
  }
) => {
  const { code = 200, message = '', data = null, error } = props || {};

  // Specified error
  if (typeof error === 'string' && ERROR_RESPONSE[error]) {
    return res.json(ERROR_RESPONSE[error]);
  }

  // another error
  let msg = message;
  if ((code < 200 || code >= 400) && !message) {
    msg = error?.body?.message || error?.message || '请求错误';
    if (typeof error === 'string') {
      msg = error;
    } else if (error?.code && error.code in ERROR_TEXT) {
      msg = ERROR_TEXT[error.code];
    }
    console.log('error:', error?.body || error);
    console.log('error message:', msg);
  }

  res.json({
    code,
    statusText: '',
    message: msg,
    data: data || error || null
  });
};
