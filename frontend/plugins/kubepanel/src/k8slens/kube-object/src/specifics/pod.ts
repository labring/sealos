/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isDefined } from '@//k8slens/utilities';
import type { RequireExactlyOne } from 'type-fest';
import type { PersistentVolumeClaimSpec } from './persistent-volume-claim';
import type {
  Affinity,
  KubeObjectMetadata,
  LocalObjectReference,
  NamespaceScopedMetadata,
  Toleration
} from '../api-types';
import { KubeObject } from '../kube-object';
import type {
  Container,
  ObjectFieldSelector,
  PodSecurityContext,
  Probe,
  ResourceFieldSelector
} from '../types';
import type { SecretReference } from './secret';

// Reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.19/#read-log-pod-v1-core
export interface PodLogsQuery {
  container?: string;
  tailLines?: number;
  timestamps?: boolean;
  sinceTime?: string; // Date.toISOString()-format
  follow?: boolean;
  previous?: boolean;
}

export enum PodStatusPhase {
  TERMINATED = 'Terminated',
  FAILED = 'Failed',
  PENDING = 'Pending',
  RUNNING = 'Running',
  SUCCEEDED = 'Succeeded',
  EVICTED = 'Evicted'
}

export interface ContainerStateRunning {
  startedAt: string;
}

export interface ContainerStateWaiting {
  reason: string;
  message: string;
}

export interface ContainerStateTerminated {
  startedAt: string;
  finishedAt: string;
  exitCode: number;
  reason: string;
  containerID?: string;
  message?: string;
  signal?: number;
}

/**
 * ContainerState holds a possible state of container. Only one of its members
 * may be specified. If none of them is specified, the default one is
 * `ContainerStateWaiting`.
 */
export interface ContainerState {
  running?: ContainerStateRunning;
  waiting?: ContainerStateWaiting;
  terminated?: ContainerStateTerminated;
}

export type ContainerStateValues = Partial<ContainerState[keyof ContainerState]>;

export interface PodContainerStatus {
  name: string;
  state?: ContainerState;
  lastState?: ContainerState;
  ready: boolean;
  restartCount: number;
  image: string;
  imageID: string;
  containerID?: string;
  started?: boolean;
}

export interface AwsElasticBlockStoreSource {
  volumeID: string;
  fsType: string;
}

export interface AzureDiskSource {
  /**
   * The name of the VHD blob object OR the name of an Azure managed data disk if `kind` is `"Managed"`.
   */
  diskName: string;
  /**
   * The URI of the vhd blob object OR the `resourceID` of an Azure managed data disk if `kind` is `"Managed"`.
   */
  diskURI: string;
  /**
   * Kind of disk
   * @default "Shared"
   */
  kind?: 'Shared' | 'Dedicated' | 'Managed';
  /**
   * Disk caching mode.
   * @default "None"
   */
  cachingMode?: 'None' | 'ReadOnly' | 'ReadWrite';
  /**
   * The filesystem type to mount.
   * @default "ext4"
   */
  fsType?: string;
  /**
   * Whether the filesystem is used as readOnly.
   * @default false
   */
  readonly?: boolean;
}

export interface AzureFileSource {
  /**
   * The name of the secret that contains both Azure storage account name and key.
   */
  secretName: string;
  /**
   * The share name to be used.
   */
  shareName: string;
  /**
   * In case the secret is stored in a different namespace.
   * @default "default"
   */
  secretNamespace?: string;
  /**
   * Whether the filesystem is used as readOnly.
   */
  readOnly: boolean;
}

export interface CephfsSource {
  /**
   * List of Ceph monitors
   */
  monitors: string[];
  /**
   * Used as the mounted root, rather than the full Ceph tree.
   * @default "/"
   */
  path?: string;
  /**
   * The RADOS user name.
   * @default "admin"
   */
  user?: string;
  /**
   * The path to the keyring file.
   * @default "/etc/ceph/user.secret"
   */
  secretFile?: string;
  /**
   * Reference to Ceph authentication secrets. If provided, then the secret overrides `secretFile`
   */
  secretRef?: SecretReference;
  /**
   * Whether the filesystem is used as readOnly.
   *
   * @default false
   */
  readOnly?: boolean;
}

export interface CinderSource {
  volumeID: string;
  fsType: string;
  /**
   * @default false
   */
  readOnly?: boolean;
  secretRef?: SecretReference;
}

export interface ConfigMapSource {
  name: string;
  items: {
    key: string;
    path: string;
  }[];
}

export interface DownwardApiSource {
  items: {
    path: string;
    fieldRef: {
      fieldPath: string;
    };
  }[];
}

export interface EphemeralSource {
  volumeClaimTemplate: {
    /**
     * All the rest of the fields are ignored and rejected during validation
     */
    metadata?: Pick<KubeObjectMetadata, 'labels' | 'annotations'>;
    spec: PersistentVolumeClaimSpec;
  };
}

export interface EmptyDirSource {
  medium?: string;
  sizeLimit?: string;
}

export interface FiberChannelSource {
  /**
   * A list of World Wide Names
   */
  targetWWNs: string[];
  /**
   * Logical Unit number
   */
  lun: number;
  /**
   * The type of filesystem
   * @default "ext4"
   */
  fsType?: string;
  readOnly: boolean;
}

export interface FlockerSource {
  datasetName: string;
}

export interface FlexVolumeSource {
  driver: string;
  fsType?: string;
  secretRef?: LocalObjectReference;
  /**
   * @default false
   */
  readOnly?: boolean;
  options?: Record<string, string>;
}

export interface GcePersistentDiskSource {
  pdName: string;
  fsType: string;
}

export interface GitRepoSource {
  repository: string;
  revision: string;
}

export interface GlusterFsSource {
  /**
   * The name of the Endpoints object that represents a Gluster cluster configuration.
   */
  endpoints: string;
  /**
   * The Glusterfs volume name.
   */
  path: string;
  /**
   * The boolean that sets the mountpoint readOnly or readWrite.
   */
  readOnly: boolean;
}

export interface HostPathSource {
  path: string;
  /**
   * Determines the sorts of checks that will be done
   * @default ""
   */
  type?:
    | ''
    | 'DirectoryOrCreate'
    | 'Directory'
    | 'FileOrCreate'
    | 'File'
    | 'Socket'
    | 'CharDevice'
    | 'BlockDevice';
}

export interface IScsiSource {
  targetPortal: string;
  iqn: string;
  lun: number;
  fsType: string;
  readOnly: boolean;
  chapAuthDiscovery?: boolean;
  chapAuthSession?: boolean;
  secretRef?: SecretReference;
}

export interface LocalSource {
  path: string;
}

export interface NetworkFsSource {
  server: string;
  path: string;
  readOnly?: boolean;
}

export interface PersistentVolumeClaimSource {
  claimName: string;
}

export interface PhotonPersistentDiskSource {
  pdID: string;
  /**
   * @default "ext4"
   */
  fsType?: string;
}

export interface PortworxVolumeSource {
  volumeID: string;
  fsType?: string;
  readOnly?: boolean;
}

export interface KeyToPath {
  key: string;
  path: string;
  mode?: number;
}

export interface ConfigMapProjection {
  name: string;
  items?: KeyToPath[];
  optional?: boolean;
}

export interface DownwardAPIVolumeFile {
  path: string;
  fieldRef?: ObjectFieldSelector;
  resourceFieldRef?: ResourceFieldSelector;
  mode?: number;
}

export interface DownwardAPIProjection {
  items?: DownwardAPIVolumeFile[];
}

export interface SecretProjection {
  name: string;
  items?: KeyToPath[];
  optional?: boolean;
}

export interface ServiceAccountTokenProjection {
  audience?: string;
  expirationSeconds?: number;
  path: string;
}

export interface VolumeProjection {
  secret?: SecretProjection;
  downwardAPI?: DownwardAPIProjection;
  configMap?: ConfigMapProjection;
  serviceAccountToken?: ServiceAccountTokenProjection;
}

export interface ProjectedSource {
  sources?: VolumeProjection[];
  defaultMode?: number;
}

export interface QuobyteSource {
  registry: string;
  volume: string;
  /**
   * @default false
   */
  readOnly?: boolean;
  /**
   * @default "serivceaccount"
   */
  user?: string;
  group?: string;
  tenant?: string;
}

export interface RadosBlockDeviceSource {
  monitors: string[];
  image: string;
  /**
   * @default "ext4"
   */
  fsType?: string;
  /**
   * @default "rbd"
   */
  pool?: string;
  /**
   * @default "admin"
   */
  user?: string;
  /**
   * @default "/etc/ceph/keyring"
   */
  keyring?: string;
  secretRef?: SecretReference;
  /**
   * @default false
   */
  readOnly?: boolean;
}

export interface ScaleIoSource {
  gateway: string;
  system: string;
  secretRef?: LocalObjectReference;
  /**
   * @default false
   */
  sslEnabled?: boolean;
  protectionDomain?: string;
  storagePool?: string;
  /**
   * @default "ThinProvisioned"
   */
  storageMode?: 'ThickProvisioned' | 'ThinProvisioned';
  volumeName: string;
  /**
   * @default "xfs"
   */
  fsType?: string;
  /**
   * @default false
   */
  readOnly?: boolean;
}

export interface SecretSource {
  secretName: string;
  items?: {
    key: string;
    path: string;
    mode?: number;
  }[];
  defaultMode?: number;
  optional?: boolean;
}

export interface StorageOsSource {
  volumeName: string;
  /**
   * @default Pod.metadata.namespace
   */
  volumeNamespace?: string;
  /**
   * @default "ext4"
   */
  fsType?: string;
  /**
   * @default false
   */
  readOnly?: boolean;
  secretRef?: LocalObjectReference;
}

export interface VsphereVolumeSource {
  volumePath: string;
  /**
   * @default "ext4"
   */
  fsType?: string;
  storagePolicyName?: string;
  storagePolicyID?: string;
}

export interface ContainerStorageInterfaceSource {
  driver: string;
  /**
   * @default false
   */
  readOnly?: boolean;
  /**
   * @default "ext4"
   */
  fsType?: string;
  volumeAttributes?: Record<string, string>;
  controllerPublishSecretRef?: SecretReference;
  nodeStageSecretRef?: SecretReference;
  nodePublishSecretRef?: SecretReference;
  controllerExpandSecretRef?: SecretReference;
}

export interface PodVolumeVariants {
  awsElasticBlockStore: AwsElasticBlockStoreSource;
  azureDisk: AzureDiskSource;
  azureFile: AzureFileSource;
  cephfs: CephfsSource;
  cinder: CinderSource;
  configMap: ConfigMapSource;
  csi: ContainerStorageInterfaceSource;
  downwardAPI: DownwardApiSource;
  emptyDir: EmptyDirSource;
  ephemeral: EphemeralSource;
  fc: FiberChannelSource;
  flexVolume: FlexVolumeSource;
  flocker: FlockerSource;
  gcePersistentDisk: GcePersistentDiskSource;
  gitRepo: GitRepoSource;
  glusterfs: GlusterFsSource;
  hostPath: HostPathSource;
  iscsi: IScsiSource;
  local: LocalSource;
  nfs: NetworkFsSource;
  persistentVolumeClaim: PersistentVolumeClaimSource;
  photonPersistentDisk: PhotonPersistentDiskSource;
  portworxVolume: PortworxVolumeSource;
  projected: ProjectedSource;
  quobyte: QuobyteSource;
  rbd: RadosBlockDeviceSource;
  scaleIO: ScaleIoSource;
  secret: SecretSource;
  storageos: StorageOsSource;
  vsphereVolume: VsphereVolumeSource;
}

/**
 * The valid kinds of volume
 */
export type PodVolumeKind = keyof PodVolumeVariants;

export type PodSpecVolume = RequireExactlyOne<PodVolumeVariants> & {
  name: string;
};

export interface HostAlias {
  ip: string;
  hostnames: string[];
}

export interface Sysctl {
  name: string;
  value: string;
}

export interface TopologySpreadConstraint {}

export interface PodSpec {
  activeDeadlineSeconds?: number;
  affinity?: Affinity;
  automountServiceAccountToken?: boolean;
  containers?: Container[];
  dnsPolicy?: string;
  enableServiceLinks?: boolean;
  ephemeralContainers?: unknown[];
  hostAliases?: HostAlias[];
  hostIPC?: boolean;
  hostname?: string;
  hostNetwork?: boolean;
  hostPID?: boolean;
  imagePullSecrets?: LocalObjectReference[];
  initContainers?: Container[];
  nodeName?: string;
  nodeSelector?: Partial<Record<string, string>>;
  overhead?: Partial<Record<string, string>>;
  preemptionPolicy?: string;
  priority?: number;
  priorityClassName?: string;
  readinessGates?: unknown[];
  restartPolicy?: string;
  runtimeClassName?: string;
  schedulerName?: string;
  securityContext?: PodSecurityContext;
  serviceAccount?: string;
  serviceAccountName?: string;
  setHostnameAsFQDN?: boolean;
  shareProcessNamespace?: boolean;
  subdomain?: string;
  terminationGracePeriodSeconds?: number;
  tolerations?: Toleration[];
  topologySpreadConstraints?: TopologySpreadConstraint[];
  volumes?: PodSpecVolume[];
}

export interface PodCondition {
  lastProbeTime?: number;
  lastTransitionTime?: string;
  message?: string;
  reason?: string;
  type: string;
  status: string;
}

export interface PodStatus {
  phase: string;
  conditions: PodCondition[];
  hostIP: string;
  podIP: string;
  podIPs?: {
    ip: string;
  }[];
  startTime: string;
  initContainerStatuses?: PodContainerStatus[];
  containerStatuses?: PodContainerStatus[];
  qosClass?: string;
  reason?: string;
}

export class Pod extends KubeObject<NamespaceScopedMetadata, PodStatus, PodSpec> {
  static kind = 'Pod';

  static namespaced = true;

  static apiBase = '/api/v1/pods';

  getAffinityNumber() {
    return Object.keys(this.getAffinity()).length;
  }

  getInitContainers() {
    return this.spec?.initContainers ?? [];
  }

  getContainers() {
    return this.spec?.containers ?? [];
  }

  getAllContainers() {
    return [...this.getContainers(), ...this.getInitContainers()];
  }

  getRunningContainers() {
    const runningContainerNames = new Set(
      this.getContainerStatuses()
        .filter(({ state }) => state?.running)
        .map(({ name }) => name)
    );

    return this.getAllContainers().filter(({ name }) => runningContainerNames.has(name));
  }

  getContainerStatuses(includeInitContainers = true): PodContainerStatus[] {
    const { containerStatuses = [], initContainerStatuses = [] } = this.status ?? {};

    if (includeInitContainers) {
      return [...containerStatuses, ...initContainerStatuses];
    }

    return [...containerStatuses];
  }

  getRestartsCount(): number {
    const { containerStatuses = [] } = this.status ?? {};

    return containerStatuses.reduce((totalCount, { restartCount }) => totalCount + restartCount, 0);
  }

  getQosClass() {
    return this.status?.qosClass || '';
  }

  getReason() {
    return this.status?.reason || '';
  }

  getPriorityClassName() {
    return this.spec?.priorityClassName || '';
  }

  getRuntimeClassName() {
    return this.spec?.runtimeClassName || '';
  }

  getServiceAccountName() {
    return this.spec?.serviceAccountName || '';
  }

  getStatus(): PodStatusPhase {
    const phase = this.getStatusPhase();
    const reason = this.getReason();
    const trueConditionTypes = new Set(
      this.getConditions()
        .filter(({ status }) => status === 'True')
        .map(({ type }) => type)
    );
    const isInGoodCondition = ['Initialized', 'Ready'].every((condition) =>
      trueConditionTypes.has(condition)
    );

    if (reason === PodStatusPhase.EVICTED) {
      return PodStatusPhase.EVICTED;
    }

    if (phase === PodStatusPhase.FAILED) {
      return PodStatusPhase.FAILED;
    }

    if (phase === PodStatusPhase.SUCCEEDED) {
      return PodStatusPhase.SUCCEEDED;
    }

    if (phase === PodStatusPhase.RUNNING && isInGoodCondition) {
      return PodStatusPhase.RUNNING;
    }

    return PodStatusPhase.PENDING;
  }

  // Returns pod phase or container error if occurred
  getStatusMessage(): string {
    if (this.getReason() === PodStatusPhase.EVICTED) {
      return 'Evicted';
    }

    if (this.metadata.deletionTimestamp) {
      return 'Terminating';
    }

    return this.getStatusPhase() || 'Waiting';
  }

  getStatusPhase() {
    return this.status?.phase;
  }

  getConditions() {
    return this.status?.conditions ?? [];
  }

  getVolumes() {
    return this.spec?.volumes ?? [];
  }

  getSecrets(): string[] {
    return this.getVolumes()
      .map((vol) => vol.secret?.secretName)
      .filter(isDefined);
  }

  getNodeSelectors(): string[] {
    return Object.entries(this.spec?.nodeSelector ?? {}).map((values) => values.join(': '));
  }

  getTolerations() {
    return this.spec?.tolerations ?? [];
  }

  getAffinity(): Affinity {
    return this.spec?.affinity ?? {};
  }

  hasIssues() {
    for (const { type, status } of this.getConditions()) {
      if (type === 'Ready' && status !== 'True') {
        return true;
      }
    }

    for (const { state } of this.getContainerStatuses()) {
      if (state?.waiting?.reason === 'CrashLookBackOff') {
        return true;
      }
    }

    return this.getStatusPhase() !== 'Running';
  }

  getLivenessProbe(container: Container) {
    return this.getProbe(container, container.livenessProbe);
  }

  getReadinessProbe(container: Container) {
    return this.getProbe(container, container.readinessProbe);
  }

  getStartupProbe(container: Container) {
    return this.getProbe(container, container.startupProbe);
  }

  private getProbe(container: Container, probe: Probe | undefined): string[] {
    const probeItems: string[] = [];

    if (!probe) {
      return probeItems;
    }

    const {
      httpGet,
      exec,
      tcpSocket,
      initialDelaySeconds = 0,
      timeoutSeconds = 0,
      periodSeconds = 0,
      successThreshold = 0,
      failureThreshold = 0
    } = probe;

    // HTTP Request
    if (httpGet) {
      const { path = '', port, host = '', scheme = 'HTTP' } = httpGet;
      const resolvedPort =
        typeof port === 'number'
          ? port
          : // Try and find the port number associated witht the name or fallback to the name itself
            container.ports?.find((containerPort) => containerPort.name === port)?.containerPort ||
            port;

      probeItems.push('http-get', `${scheme.toLowerCase()}://${host}:${resolvedPort}${path}`);
    }

    // Command
    if (exec?.command) {
      probeItems.push(`exec [${exec.command.join(' ')}]`);
    }

    // TCP Probe
    if (tcpSocket?.port) {
      probeItems.push(`tcp-socket :${tcpSocket.port}`);
    }

    probeItems.push(
      `delay=${initialDelaySeconds}s`,
      `timeout=${timeoutSeconds}s`,
      `period=${periodSeconds}s`,
      `#success=${successThreshold}`,
      `#failure=${failureThreshold}`
    );

    return probeItems;
  }

  getNodeName(): string | undefined {
    return this.spec?.nodeName;
  }

  getSelectedNodeOs(): string | undefined {
    return (
      this.spec?.nodeSelector?.['kubernetes.io/os'] ||
      this.spec?.nodeSelector?.['beta.kubernetes.io/os']
    );
  }

  getIPs(): string[] {
    const podIPs = this.status?.podIPs ?? [];

    return podIPs.map((value) => value.ip);
  }
}
