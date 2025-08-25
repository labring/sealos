import { IncomingHttpHeaders } from 'http';

export const authSession = async (header: IncomingHttpHeaders) => {
  try {
    if (!header?.authorization) {
      return Promise.reject('缺少凭证');
    }

    const kubeconfig = decodeURIComponent(header.authorization);
    return Promise.resolve(kubeconfig);
  } catch (err) {
    return Promise.reject('凭证错误');
  }
};
