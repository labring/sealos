import { IncomingHttpHeaders } from 'http';
import { K8sApi } from '@/service/backend/kubernetes';

export const authSession = async (header: IncomingHttpHeaders) => {
  try {
    if (!header?.authorization) {
      return Promise.reject('缺少凭证');
    }

    const kubeconfig = decodeURIComponent(header.authorization);
    const kc = K8sApi(kubeconfig);

    return Promise.resolve(kc);
  } catch (err) {
    return Promise.reject('凭证错误');
  }
};
