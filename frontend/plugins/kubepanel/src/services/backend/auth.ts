import { IncomingHttpHeaders } from 'http';

export const authSession = async (header: IncomingHttpHeaders) => {
  if (!header) return Promise.reject('unAuthorization');
  const { authorization } = header;
  if (!authorization) return Promise.reject('unAuthorization');

  try {
    const kubeConfig = decodeURIComponent(authorization);
    return Promise.resolve(kubeConfig);
  } catch (err) {
    return Promise.reject('unAuthorization');
  }
};
