import { IncomingHttpHeaders } from 'http';

export const authSession = async (header: IncomingHttpHeaders | Headers) => {
  try {
    let authorization: string | null = '';

    if ('authorization' in header && header?.authorization) {
      authorization = header.authorization;
    } else if (header instanceof Headers && header?.get('Authorization')) {
      authorization = header.get('Authorization');
    }

    if (authorization === null || authorization === '') {
      return Promise.reject('缺少凭证');
    }

    const kubeconfig = decodeURIComponent(authorization);
    return Promise.resolve(kubeconfig);
  } catch (err) {
    return Promise.reject('凭证错误');
  }
};
