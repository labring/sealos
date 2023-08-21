import { IncomingHttpHeaders } from 'http';
import { ERROR_ENUM } from '../error';

export const authSession = async (header: IncomingHttpHeaders) => {
  if (!header) return Promise.reject(ERROR_ENUM.unAuthorization);
  const { authorization } = header;
  if (!authorization) return Promise.reject(ERROR_ENUM.unAuthorization);

  try {
    const kubeConfig = decodeURIComponent(authorization);
    return Promise.resolve(kubeConfig);
  } catch (err) {
    return Promise.reject(ERROR_ENUM.unAuthorization);
  }
};
