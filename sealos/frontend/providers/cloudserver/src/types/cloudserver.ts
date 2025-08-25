import { CVMChargeType } from './region';

export type EditForm = {
  system: string;
  systemImageId: string;
  publicIpAssigned: boolean;
  internetMaxBandWidthOut: number;
  password: string;
  autoPassword: boolean;
  storages: StorageType[];
  virtualMachinePackageFamily: string;
  virtualMachinePackageName: string;
  virtualMachineType: string;
  virtualMachineArch: string;
  chargeType: CVMChargeType;
  zone: string;
  period: string;
  counts: number;
};

export type StorageType = {
  type?: string;
  size: number;
  amount: number;
  use: 'SystemDisk' | 'DataDisk';
};

export type BandwidthPricingTier = {
  minBandwidth: number;
  maxBandwidth: number;
  pricePerMbps: number;
};

export type CloudServerType = {
  cpu?: number;
  memory?: number;
  gpu?: number;
  virtualMachinePackageFamily: string;
  virtualMachinePackageName: string;
  instancePrice: number;
  diskPerG: number;
  networkSpeedBoundary: number;
  networkSpeedUnderSpeedBoundaryPerHour: number;
  networkSpeedAboveSpeedBoundaryPerHour: number;
  status: CloudServerStatus;
  bandwidthPricingTiers: BandwidthPricingTier[];
};

export enum CloudServerStatus {
  Available = 'available',
  Unavailable = 'unavailable'
}

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

export type CloudServerPrice = {
  instancePrice: number;
  networkPrice: number;
  diskPrice: number;
};

export type CreateCloudServerPayload = {
  imageId: string;
  systemDisk: number;
  dataDisks: number[];
  internetMaxBandwidthOut?: number;
  loginPassword: string;
  virtualMachinePackageFamily: string;
  virtualMachinePackageName: string;
  loginName: string;
  metaData: {
    [key: string]: any;
  };
  zone: string;
  virtualMachineType: string;
  virtualMachineArch: string;
  chargeType: CVMChargeType;
  period: number;
  counts: number;
};
