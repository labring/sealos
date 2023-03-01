import * as k8s from '@kubernetes/client-node';
import { ApplicationType, RunApplication, StartResp } from 'interfaces/kubernetes';

const RedisInsightApplication: RunApplication = {
  name: 'Redis Insight',
  description: 'Redis Insight',
  icon: '/images/redisinsight.svg',
  application_type: ApplicationType.IFrame,
  startTemplate: '',
  doStart: async (kc: k8s.KubeConfig): Promise<StartResp> => {
    return Promise.resolve({
      status: 200,
      application_type: ApplicationType.IFrame,
      iframe_page: 'https://redisinsight.cloud.sealos.io/'
    });
  }
};

export { RedisInsightApplication };
