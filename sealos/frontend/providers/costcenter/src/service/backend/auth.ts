import { IncomingHttpHeaders } from 'http';
import { K8sApi } from '@/service/backend/kubernetes';
import * as yaml from 'js-yaml';
export const authSession = async (header: IncomingHttpHeaders) => {
  try {
    if (!header?.authorization) {
      return Promise.reject('缺少凭证');
    }

    const kubeconfig = decodeURIComponent(header.authorization);
    const kc = K8sApi(kubeconfig);

    // rewrite exportConfig to stop transform domain to ip
    kc.exportConfig = () => {
      const domain = global.AppConfig.cloud.domain;
      if (!domain) return kubeconfig;
      const oldKc = yaml.load(kubeconfig);
      const newServer = `https://${domain}:6443`;
      //@ts-ignore
      oldKc.clusters[0].cluster.server = newServer;
      const newkubeconfig = yaml.dump(oldKc);
      return newkubeconfig;
    };
    return Promise.resolve(kc);
  } catch (err) {
    return Promise.reject('凭证错误');
  }
};
