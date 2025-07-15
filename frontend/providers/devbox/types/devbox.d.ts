import {
  V1ConfigMap,
  V1Deployment,
  V1HorizontalPodAutoscaler,
  V1Ingress,
  V1Pod,
  V1Secret,
  V1Service,
  V1StatefulSet
} from '@kubernetes/client-node';

import {
  DevboxReleaseStatusEnum,
  DevboxStatusEnum,
  FrameworkTypeEnum,
  LanguageTypeEnum,
  OSTypeEnum,
  PodStatusEnum,
  YamlKindEnum
} from '@/constants/devbox';
import { PortInfos } from './ingress';
import { MonitorDataResult } from './monitor';

export type DevboxStatusValueType = `${DevboxStatusEnum}`;
export type DevboxReleaseStatusValueType = `${DevboxReleaseStatusEnum}`;
export type RuntimeType = `${FrameworkTypeEnum}` | `${LanguageTypeEnum}` | `${OSTypeEnum}`;
export type ProtocolType = 'HTTP' | 'GRPC' | 'WS';

export type ShutdownModeType = 'Stopped' | 'Shutdown';

export type GpuType = {
  manufacturers: string;
  type: string;
  amount: number;
};

export interface DevboxEditType {
  name: string;
  runtimeType: string;
  runtimeVersion: string;
  cpu: number;
  memory: number;
  gpu?: GpuType;
  networks: {
    networkName: string;
    portName: string;
    port: number;
    protocol: ProtocolType;
    openPublicDomain: boolean;
    publicDomain: string; // default domain
    customDomain: string; // custom domain
  }[];
}
export interface DevboxEditTypeV2 {
  name: string;
  templateUid: string;
  templateRepositoryUid: string;
  templateConfig: string; //json
  image: string;
  cpu: number;
  memory: number;
  gpu?: GpuType;
  networks: PortInfos;
}
export interface DevboxStatusMapType {
  label: string;
  value: DevboxStatusValueType;
  color: string;
  backgroundColor: string;
  dotColor: string;
}
export interface DevboxReleaseStatusMapType {
  label: string;
  value: DevboxReleaseStatusValueType;
  color: string;
  backgroundColor: string;
  dotColor: string;
}

export interface DevboxConditionItemType {
  lastTransitionTime: string;
  message: string;
  observedGeneration: 3;
  reason: string;
  status: 'True' | 'False';
  type: string;
}

export interface DevboxDetailType extends DevboxEditType {
  id: string;
  upTime?: string;
  createTime: string;
  isPause?: boolean;
  status: DevboxStatusMapType;
  usedCpu: MonitorDataResult;
  usedMemory: MonitorDataResult;
  sshConfig?: {
    sshUser: string;
    sshDomain: string;
    sshPort: number;
    sshPrivateKey: string;
    token: string;
  };
  sshPort?: number;
  lastTerminatedReason?: string;
}
export interface DevboxDetailTypeV2 extends json2DevboxV2Data {
  id: string;
  upTime?: string;
  createTime: string;
  isPause?: boolean;
  iconId: string;
  templateName: string;
  templateRepositoryName: string;
  templateRepositoryDescription: string | null;
  status: DevboxStatusMapType;
  usedCpu: MonitorDataResult;
  usedMemory: MonitorDataResult;
  sshConfig?: {
    sshUser: string;
    sshDomain: string;
    sshPort: number;
    sshPrivateKey: string;
    token: string;
  };
  sshPort?: number;
  lastTerminatedReason?: string;
}
export interface NetworkType {
  networkName: string;
  portName: string;
  port: number;
  protocol: ProtocolType;
  openPublicDomain: boolean;
  publicDomain: string; // default domain
  customDomain: string; // custom domain
}

export interface DevboxListItemType {
  id: string;
  name: string;
  runtimeType: string;
  runtimeVersion: string;
  status: DevboxStatusMapType;
  createTime: string;
  cpu: number;
  memory: number;
  usedCpu: MonitorDataResult;
  usedMemory: MonitorDataResult;
  sshPort: number;
  lastTerminatedReason?: string;
}
export interface DevboxListItemTypeV2 {
  id: string;
  name: string;
  // templateRepository: object
  template: {
    templateRepository: {
      iconId: string | null;
    };
    uid: string;
    name: string;
  };
  status: DevboxStatusMapType;
  createTime: string;
  cpu: number;
  memory: number;
  usedCpu: MonitorDataResult;
  usedMemory: MonitorDataResult;
  sshPort: number;
  lastTerminatedReason?: string;
}
export interface DevboxVersionListItemType {
  id: string;
  name: string;
  devboxName: string;
  tag: string;
  createTime: string;
  description: string;
  status: DevboxReleaseStatusMapType;
}

export type DevboxPatchPropsType = (
  | { type: 'delete'; kind: `${YamlKindEnum}`; name: string }
  | { type: 'patch'; kind: `${YamlKindEnum}`; value: Record<string, any> }
  | { type: 'create'; kind: `${YamlKindEnum}`; value: string }
)[];

export type DevboxKindsType =
  | V1Deployment
  | V1StatefulSet
  | V1ConfigMap
  | V1Service
  | V1Ingress
  | V1Secret
  | V1HorizontalPodAutoscaler;

export interface ValueType {
  id: string;
  label: string;
}

export interface VersionMapType {
  [key: string]: ValueTypeWithPorts[];
}

export interface ValueTypeWithPorts extends ValueType {
  defaultPorts: number[];
}

export interface runtimeNamespaceMapType {
  [key: string]: string;
}

export interface PodStatusMapType {
  label: string;
  value: `${PodStatusEnum}`;
  color: string;
  reason?: string;
  message?: string;
}

export interface PodDetailType extends V1Pod {
  podName: string;
  upTime: string;
  status: PodStatusMapType;
  nodeName: string;
  ip: string;
  restarts: number;
  age: string;
  usedCpu: MonitorDataResult;
  usedMemory: MonitorDataResult;
  cpu: number;
  memory: number;
  podReason?: string;
  podMessage?: string;
  containerStatus: PodStatusMapType;
}

export interface json2DevboxV2Data extends DevboxEditTypeV2 {
  templateConfig: string;
  image: string;
}
