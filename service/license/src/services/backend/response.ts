import { NextApiResponse } from 'next';

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

  // another error
  let msg = message;
  if ((code < 200 || code >= 400) && !message) {
    msg = error?.body?.message || error?.message || '请求错误';
    if (typeof error === 'string') {
      msg = error;
    }
    console.error('===jsonRes error===\n', error);
  }

  res.json({
    code,
    statusText: '',
    message: msg,
    data: data || error || null
  });
};
