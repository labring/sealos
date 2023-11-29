import { KubeApiUrlParams } from '@/services/backend/api';
import { Resources, ResourceKey } from './kube-object';

type UrlParams = Omit<KubeApiUrlParams, 'serverUrl' | 'namespace'>;

export const ApiBaseParamsMap: Record<ResourceKey, UrlParams> = {
  pods: {
    apiPrefix: 'api',
    apiGroup: undefined,
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
    apiGroup: undefined,
    apiVersion: 'v1',
    resource: Resources.ConfigMaps
  },
  persistentvolumeclaims: {
    apiPrefix: 'api',
    apiGroup: undefined,
    apiVersion: 'v1',
    resource: Resources.PersistentVolumeClaims
  },
  secrets: {
    apiPrefix: 'api',
    apiGroup: undefined,
    apiVersion: 'v1',
    resource: Resources.Secrets
  },
  ingresses: {
    apiPrefix: 'apis',
    apiGroup: 'networking.k8s.io',
    apiVersion: 'v1',
    resource: Resources.Ingresses
  }
};
