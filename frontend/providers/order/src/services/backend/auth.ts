import type { NextApiRequest } from 'next';
import { ERROR_ENUM } from '../error';

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

// server
export const AuthAdmin = (namespace: string) => {
  const env = process.env.ADMIN_USER;
  if (!env) {
    return false;
  }
  const users = env.split(',');
  return users.includes(namespace);
};
