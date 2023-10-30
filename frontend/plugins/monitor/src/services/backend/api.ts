import { Resources } from '@/constants/kube-object';

export type KubeApiUrlParams = {
  serverUrl: string;
  apiPrefix: string;
  apiGroup: string;
  apiVersion: string;
  namespace: string;
  resource: Resources;
};
