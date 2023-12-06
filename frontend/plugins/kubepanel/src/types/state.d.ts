import {
  ConfigMap,
  Deployment,
  Ingress,
  KubeEvent,
  KubeObject,
  PersistentVolumeClaim,
  Pod,
  Secret,
  StatefulSet
} from '@/k8slens/kube-object';

type KubeStoreState<K extends KubeObject> = {
  items: Array<K>;
  kind: K['kind'];
  isLoaded: boolean;
};
type KubeStoreAction<K extends KubeObject> = {
  modify: (item: K) => void;
  remove: (item: K) => void;
  replace: (items: K[]) => void;
  setIsLoaded: (isLoaded: boolean) => void;
};

type KubeStore<K extends KubeObject> = KubeStoreState<K> & KubeStoreAction<K>;

type StatusesComputed = {
  getStatuses: Record<string, number>;
};

type PodStore = KubeStore<Pod>;
type DeploymentStore = KubeStore<Deployment>;
type StatefulSetStore = KubeStore<StatefulSet>;
type ConfigMapStore = KubeStore<ConfigMap>;
type VolumeClaimStore = KubeStore<PersistentVolumeClaim>;
type SecretStore = KubeStore<Secret>;
type IngressStore = KubeStore<Ingress>;
type EventStore = KubeStore<KubeEvent>;
