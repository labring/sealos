import { ApplicationProtocolType, TAppSourceType, TransportProtocolType } from '@/types/app';

export enum AppStatusEnum {
  running = 'running',
  creating = 'creating',
  waiting = 'waiting',
  error = 'error',
  pause = 'pause'
}
export const appStatusMap = {
  [AppStatusEnum.running]: {
    label: 'Running',
    value: AppStatusEnum.running,
    color: 'green.600',
    backgroundColor: 'green.50',
    dotColor: 'green.600'
  },
  [AppStatusEnum.creating]: {
    label: 'Creating',
    value: AppStatusEnum.creating,
    color: 'grayModern.500',
    backgroundColor: 'grayModern.100',
    dotColor: 'grayModern.500'
  },
  [AppStatusEnum.error]: {
    label: 'Abnormality Detected',
    value: AppStatusEnum.error,
    color: 'rgba(240, 68, 56, 1)',
    backgroundColor: 'rgba(254, 243, 242, 1)',
    dotColor: 'rgba(240, 68, 56, 1)'
  },
  [AppStatusEnum.pause]: {
    label: 'Paused',
    value: AppStatusEnum.pause,
    color: 'rgba(111, 93, 215, 1)',
    backgroundColor: 'rgba(240, 238, 255, 1)',
    dotColor: 'rgba(111, 93, 215, 1)'
  },
  [AppStatusEnum.waiting]: {
    label: 'Waiting',
    value: AppStatusEnum.waiting,
    color: 'grayModern.500',
    backgroundColor: 'rgba(17, 24, 36, 0.05)',
    dotColor: 'grayModern.500'
  }
};

export enum PodStatusEnum {
  waiting = 'waiting',
  running = 'running',
  terminated = 'terminated'
}
export const podStatusMap = {
  [PodStatusEnum.running]: {
    label: 'running',
    value: PodStatusEnum.running,
    color: 'green.600'
  },
  [PodStatusEnum.waiting]: {
    label: 'waiting',
    value: PodStatusEnum.waiting,
    color: '#787A90',
    reason: '',
    message: ''
  },
  [PodStatusEnum.terminated]: {
    label: 'terminated',
    value: PodStatusEnum.terminated,
    color: '#8172D8',
    reason: '',
    message: ''
  }
};

export const ProtocolList = [
  { value: 'HTTP', label: 'https://', inline: 'http://' },
  { value: 'GRPC', label: 'grpcs://', inline: 'grpc://' },
  { value: 'WS', label: 'wss://', inline: 'ws://' },
  { value: 'TCP', label: 'tcp://', inline: 'tcp://' },
  { value: 'UDP', label: 'udp://', inline: 'udp://' }
];

export const APPLICATION_PROTOCOLS: ApplicationProtocolType[] = ['HTTP', 'GRPC', 'WS'];

export const TRANSPORT_PROTOCOLS: TransportProtocolType[] = ['TCP', 'UDP', 'SCTP'];

export const defaultSliderKey = 'default';
export const pauseKey = 'deploy.cloud.sealos.io/pause';
export const maxReplicasKey = 'deploy.cloud.sealos.io/maxReplicas';
export const minReplicasKey = 'deploy.cloud.sealos.io/minReplicas';
export const deployPVCResizeKey = 'deploy.cloud.sealos.io/resize';
export const appDeployKey = 'cloud.sealos.io/app-deploy-manager';
export const publicDomainKey = `cloud.sealos.io/app-deploy-manager-domain`;
export const gpuNodeSelectorKey = 'nvidia.com/gpu.product';
export const gpuResourceKey = 'nvidia.com/gpu';
export const templateDeployKey = 'cloud.sealos.io/deploy-on-sealos';
export const sealafDeployKey = 'sealaf-app';

export enum Coin {
  cny = 'cny',
  shellCoin = 'shellCoin',
  usd = 'usd'
}

export const AppSourceConfigs: Array<{
  key: string;
  type: TAppSourceType;
}> = [
  { key: templateDeployKey, type: 'app_store' },
  { key: sealafDeployKey, type: 'sealaf' }
];
