import type { NextApiRequest } from 'next';
import { ERROR_ENUM } from '../error';
import { IncomingHttpHeaders } from 'http';

export const authSession = async (req: NextApiRequest) => {
  if (!req.headers) return Promise.reject(ERROR_ENUM.unAuthorization);
  const { authorization } = req.headers;
  if (!authorization) return Promise.reject(ERROR_ENUM.unAuthorization);

  try {
    const kubeConfig = decodeURIComponent(authorization);
    return Promise.resolve(kubeConfig);
  } catch (err) {
    return Promise.reject(ERROR_ENUM.unAuthorization);
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
