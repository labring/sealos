import {
  ConfigMap,
  Deployment,
  PersistentVolumeClaim,
  Pod,
  StatefulSet
} from '@/k8slens/kube-object';
import { StringKeyOf } from 'type-fest';

export type ResourceKey = Lowercase<StringKeyOf<typeof Resources>>;

export enum Resources {
  Pods = 'pods',
  Deployments = 'deployments',
  StatefulSets = 'statefulsets',
  ConfigMaps = 'configmaps',
  PersistentVolumeClaims = 'persistentvolumeclaims'
}

export const KubeObjectConstructorMap: { [key in Resources]: any } = {
  [Resources.Pods]: Pod,
  [Resources.Deployments]: Deployment,
  [Resources.StatefulSets]: StatefulSet,
  [Resources.ConfigMaps]: ConfigMap,
  [Resources.PersistentVolumeClaims]: PersistentVolumeClaim
};

export const KindMap: { [key in Resources]: any } = {
  [Resources.Pods]: 'Pod',
  [Resources.Deployments]: 'Deployment',
  [Resources.StatefulSets]: 'StatefulSet',
  [Resources.ConfigMaps]: 'ConfigMap',
  [Resources.PersistentVolumeClaims]: 'PersistentVolumeClaim'
};
