import {
  ConfigMap,
  Deployment,
  KubeEvent,
  PersistentVolumeClaim,
  Pod,
  StatefulSet,
} from "@/k8slens/kube-object";

export enum Resource {
  Pods = "pods",
  Deployments = "deployments",
  StatefulSets = "statefulsets",
  ConfigMaps = "configmaps",
  PersistentVolumeClaims = "persistentvolumeclaims",
  Events = "events",
}

export type KubeObjectType = {
  Pods: Pod;
  Deployments: Deployment;
  StatefulSets: StatefulSet;
  Events: KubeEvent;
  ConfigMaps: ConfigMap;
  PersistentVolumeClaims: PersistentVolumeClaim;
};

export const KubeObjectConstructorMap: { [key in Resource]: any } = {
  [Resource.Pods]: Pod,
  [Resource.Deployments]: Deployment,
  [Resource.StatefulSets]: StatefulSet,
  [Resource.ConfigMaps]: ConfigMap,
  [Resource.PersistentVolumeClaims]: PersistentVolumeClaim,
  [Resource.Events]: KubeEvent,
};
