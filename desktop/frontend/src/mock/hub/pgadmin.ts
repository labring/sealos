import * as k8s from '@kubernetes/client-node';
import { ApplicationType, RunApplication, StartResp } from 'interfaces/kubernetes';

const PostgresAdminApplication: RunApplication = {
  name: 'Postgres Admin',
  description: 'Postgres Admin',
  icon: '/images/pgadmin.svg',
  application_type: ApplicationType.IFrame,
  startTemplate: '',
  doStart: async (kc: k8s.KubeConfig): Promise<StartResp> => {
    return Promise.resolve({
      status: 200,
      application_type: ApplicationType.IFrame,
      // iframe_page: 'https://pgadmin.cloud.sealos.io/browser'
      iframe_page: 'https://pgadmin.cloud.sealos.io/'
    });
  }
};

export { PostgresAdminApplication };
