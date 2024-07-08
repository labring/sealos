import {
  ConfigMap,
  Deployment,
  Ingress,
  KubeEvent,
  KubeObject,
  KubeObjectConstructor,
  PersistentVolumeClaim,
  Pod,
  Secret,
  StatefulSet
} from '@/k8slens/kube-object';
import EventSource from 'eventsource';

type APICallback = (successResp?: number, errResp?: ErrorResponse) => void;
type WatchCloser = () => void;

type KubeStoreState<K extends KubeObject> = {
  items: Array<K>;
  kind: K['kind'];
  objConstructor: KubeObjectConstructor<K>;
  isLoaded: boolean;
  resourceVersion: string;
  es?: EventSource;
};

type KubeStoreAction<K extends KubeObject> = {
  modify: (item: K) => void;
  remove: (item: K) => void;
  initialize: (callback: APICallback) => void;
  watch: (callback: APICallback) => WatchCloser;
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
type ServiceStore = KubeStore<Service>;
