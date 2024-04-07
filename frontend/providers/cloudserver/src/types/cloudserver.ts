export type EditForm = {
  instanceType: string;
  system: string;
  systemImageId: string;
  systemDiskSize: number;
  publicIpAssigned: boolean;
  internetMaxBandWidthOut: number;
  password: string;
  autoPassword: boolean;
  storages: StorageType[];
};

export type StorageType = {
  type?: string;
  size: number;
  amount: number;
  use: string;
};

export type CloudServerType = {
  CPU: number;
  Memory: number;
  GPU: number;
  type: string;
};

export interface OperatingSystem {
  id: string;
  os: string;
  version: string;
  architect: string;
  img?: string;
}

export interface OperatingSystems {
  [key: string]: {
    images: OperatingSystem[];
    url: string;
  };
}

export enum CloudServerVendors {
  Tencent = 'tencent'
}

export enum PhaseEnum {
  Creating = 'Creating',
  Created = 'Created',
  Starting = 'Starting',
  Started = 'Started',
  Stopping = 'Stopping',
  Stopped = 'Stopped',
  Deleting = 'Deleting',
  Deleted = 'Deleted',
  // status form state
  Restarting = 'Restarting',
  Changing = 'Changing'
}

export enum StateEnum {
  Running = 'Running',
  Stopped = 'Stopped',
  Restarting = 'Restarting',
  Deleted = 'Deleted',
  Changing = 'Changing'
}

export const IntermediateStates: StateEnum[] = [StateEnum.Changing, StateEnum.Restarting];

export const IntermediatePhases: PhaseEnum[] = [
  PhaseEnum.Creating,
  PhaseEnum.Starting,
  PhaseEnum.Stopping,
  PhaseEnum.Deleting
];

export interface CVMInstanceType {
  _id: string;
  phase: PhaseEnum;
  state: StateEnum;
  namespace: string;
  sealosUserId: string;
  cpu: number;
  memory: number;
  gpu: number;
  disk: number;
  publicNetworkAccess: boolean;
  internetMaxBandwidthOut: number | null;
  imageId: string;
  instanceName: string;
  cloudProvider: string;
  createTime: string;
  updateTime: string;
  instanceId: string;
  publicIpAddresses: string[];
  privateIpAddresses: string[];
  loginName: string;
  loginPassword: string;
  loginPort: string;
}

export enum HandleEnum {
  Start = 'Start',
  Stop = 'Stop',
  Restart = 'Restart',
  Delete = 'Delete'
}
