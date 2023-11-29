import {
  ConfigMap,
  Deployment,
  Ingress,
  PersistentVolumeClaim,
  Pod,
  Secret,
  StatefulSet
} from '@/k8slens/kube-object';
import { StringKeyOf } from 'type-fest';

export type ResourceKey = Lowercase<StringKeyOf<typeof Resources>>;

export enum Resources {
  Pods = 'pods',
  Deployments = 'deployments',
  StatefulSets = 'statefulsets',
  ConfigMaps = 'configmaps',
  PersistentVolumeClaims = 'persistentvolumeclaims',
  Secrets = 'secrets',
  Ingresses = 'ingresses'
}

export const KubeObjectConstructorMap: { [key in Resources]: any } = {
  [Resources.Pods]: Pod,
  [Resources.Deployments]: Deployment,
  [Resources.StatefulSets]: StatefulSet,
  [Resources.ConfigMaps]: ConfigMap,
  [Resources.PersistentVolumeClaims]: PersistentVolumeClaim,
  [Resources.Secrets]: Secret,
  [Resources.Ingresses]: Ingress
};

export const KindMap: { [key in Resources]: any } = {
  [Resources.Pods]: 'Pod',
  [Resources.Deployments]: 'Deployment',
  [Resources.StatefulSets]: 'StatefulSet',
  [Resources.ConfigMaps]: 'ConfigMap',
  [Resources.PersistentVolumeClaims]: 'PersistentVolumeClaim',
  [Resources.Secrets]: 'Secret',
  [Resources.Ingresses]: 'Ingress'
};
