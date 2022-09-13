import { ApplicationType, RunApplication, StartResp } from '../../interfaces/kubernetes';
import * as k8s from '@kubernetes/client-node';
import { UserInfo } from '../../interfaces/session';

const KubernetesDashboardApplication: RunApplication = {
  name: 'Kubernetes Dashboard',
  description: 'Kubernetes Dashboard',
  icon: '/images/kubernetes.svg',
  application_type: ApplicationType.IFrame,
  startTemplate: '',
  doStart: async (kc: k8s.KubeConfig, user: UserInfo): Promise<StartResp> => {
    return Promise.resolve({
      status: 200,
      application_type: ApplicationType.IFrame,
      iframe_page: 'https://kubernetes-dashboard.cloud.sealos.io/'
    });
  }
};

export { KubernetesDashboardApplication };
