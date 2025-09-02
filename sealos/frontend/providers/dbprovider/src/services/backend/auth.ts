import type { NextApiRequest } from 'next';
import { IncomingHttpHeaders } from 'http';
import { ResponseCode } from '@/types/response';

export const authSession = async (req: NextApiRequest) => {
  if (!req.headers) return Promise.reject(ResponseCode.UNAUTHORIZED);
  const { authorization } = req.headers;
  if (!authorization) return Promise.reject(ResponseCode.UNAUTHORIZED);

  try {
    const kubeConfig = decodeURIComponent(authorization);
    return Promise.resolve(kubeConfig);
  } catch (err) {
    return Promise.reject(ResponseCode.UNAUTHORIZED);
  }
};

export const authAppToken = async (header: IncomingHttpHeaders) => {
  if (!header) return Promise.reject('unAuthorization');
  const { authorization } = header;
  if (!authorization) return Promise.reject('unAuthorization');

  try {
    return Promise.resolve(authorization);
  } catch (err) {
    return Promise.reject('unAuthorization');
  }
};
