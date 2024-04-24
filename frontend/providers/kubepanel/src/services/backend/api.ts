import { KubeObjectKind } from '@/constants/kube-object';
import { ErrnoCode, buildErrno } from './error';

/**
 * Retrieves the API URL based on the given kind and namespace.
 *
 * @param kind The kind of Kubernetes resource.
 * @param namespace The namespace of the API object.
 * @param name The name of Kubernetes resource.
 * @return The API URL.
 */
export function getApiUrl(kind: string, namespace: string, name?: string) {
  const baseParams = ApiBaseParamsRecord[kind as KubeObjectKind];
  if (!baseParams) {
    throw buildErrno(`Invalid kind ${kind}`, ErrnoCode.UserBadRequest);
  }
  return [
    baseParams.apiPrefix,
    baseParams.apiGroup,
    baseParams.apiVersion,
    'namespaces',
    namespace,
    baseParams.resource,
    name
  ]
    .filter(Boolean)
    .join('/');
}

const ApiBaseParamsRecord: Record<KubeObjectKind, KubeApiUrlParams> = {
  [KubeObjectKind.Pod]: {
    apiPrefix: 'api',
    // undefined means 'core' group, the following records will not write this property
    // because 'core' group won't be used to build url
    apiGroup: undefined,
    apiVersion: 'v1',
    resource: 'pods'
  },
  [KubeObjectKind.Deployment]: {
    apiPrefix: 'apis',
    apiGroup: 'apps',
    apiVersion: 'v1',
    resource: 'deployments'
  },
  [KubeObjectKind.StatefulSet]: {
    apiPrefix: 'apis',
    apiGroup: 'apps',
    apiVersion: 'v1',
    resource: 'statefulsets'
  },
  [KubeObjectKind.ConfigMap]: {
    apiPrefix: 'api',
    apiVersion: 'v1',
    resource: 'configmaps'
  },
  [KubeObjectKind.PersistentVolumeClaim]: {
    apiPrefix: 'api',
    apiVersion: 'v1',
    resource: 'persistentvolumeclaims'
  },
  [KubeObjectKind.Secret]: {
    apiPrefix: 'api',
    apiVersion: 'v1',
    resource: 'secrets'
  },
  [KubeObjectKind.Ingress]: {
    apiPrefix: 'apis',
    apiGroup: 'networking.k8s.io',
    apiVersion: 'v1',
    resource: 'ingresses'
  },
  [KubeObjectKind.Event]: {
    apiPrefix: 'api',
    apiVersion: 'v1',
    resource: 'events'
  },
  [KubeObjectKind.Service]: {
    apiPrefix: 'api',
    apiVersion: 'v1',
    resource: 'services'
  }
};
