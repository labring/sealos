import * as k8s from '@kubernetes/client-node';
import { ApplicationType, RunApplication, StartResp } from 'interfaces/kubernetes';

const AFFiNEApplication: RunApplication = {
  name: 'AFFiNE',
  description: 'AFFiNE',
  icon: '/images/affine.svg',
  application_type: ApplicationType.IFrame,
  startTemplate: '',
  doStart: async (kc: k8s.KubeConfig): Promise<StartResp> => {
    return Promise.resolve({
      status: 200,
      application_type: ApplicationType.IFrame,
      iframe_page: 'https://affine.cloud.sealos.io/'
    });
  }
};

export { AFFiNEApplication };
