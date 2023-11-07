import { Resources, ResourceKey } from './kube-object';

type ApiPrefix = 'api' | 'apis';
type ApiGroup = '' | 'apps';
type ApiVersion = 'v1';

export type UrlParams = {
  apiPrefix: ApiPrefix;
  apiGroup: ApiGroup;
  apiVersion: ApiVersion;
  resource: Resources;
};

export const ApiBaseParamsMap: Record<ResourceKey, UrlParams> = {
  pods: {
    apiPrefix: 'api',
    apiGroup: '',
    apiVersion: 'v1',
    resource: Resources.Pods
  },
  deployments: {
    apiPrefix: 'apis',
    apiGroup: 'apps',
    apiVersion: 'v1',
    resource: Resources.Deployments
  },
  statefulsets: {
    apiPrefix: 'apis',
    apiGroup: 'apps',
    apiVersion: 'v1',
    resource: Resources.StatefulSets
  },
  configmaps: {
    apiPrefix: 'api',
    apiGroup: '',
    apiVersion: 'v1',
    resource: Resources.ConfigMaps
  },
  persistentvolumeclaims: {
    apiPrefix: 'api',
    apiGroup: '',
    apiVersion: 'v1',
    resource: Resources.PersistentVolumeClaims
  }
};
