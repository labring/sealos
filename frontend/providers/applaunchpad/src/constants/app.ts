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
    color: '#16a34a',
    backgroundColor: '#f0fdf4',
    dotColor: '#16a34a'
  },
  [AppStatusEnum.creating]: {
    label: 'Creating',
    value: AppStatusEnum.creating,
    color: '#71717a',
    backgroundColor: '#f4f4f5',
    dotColor: '#71717a'
  },
  [AppStatusEnum.error]: {
    label: 'Abnormality Detected',
    value: AppStatusEnum.error,
    color: '#f04438',
    backgroundColor: '#fef3f2',
    dotColor: '#f04438'
  },
  [AppStatusEnum.pause]: {
    label: 'Paused',
    value: AppStatusEnum.pause,
    color: '#6f5dd7',
    backgroundColor: '#f0eeff',
    dotColor: '#6f5dd7'
  },
  [AppStatusEnum.waiting]: {
    label: 'Waiting',
    value: AppStatusEnum.waiting,
    color: '#71717a',
    backgroundColor: 'rgba(17, 24, 36, 0.05)',
    dotColor: '#71717a'
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
  // nosemgrep: javascript.lang.security.detect-insecure-websocket.detect-insecure-websocket
  { value: 'WS', label: 'wss://', inline: 'ws://' },
  { value: 'TCP', label: 'tcp://', inline: 'tcp://' },
  { value: 'UDP', label: 'udp://', inline: 'udp://' }
];

export const APPLICATION_PROTOCOLS: ApplicationProtocolType[] = ['HTTP', 'GRPC', 'WS'];

export const TRANSPORT_PROTOCOLS: TransportProtocolType[] = ['TCP', 'UDP', 'SCTP'];

export const defaultSliderKey = 'default';
export const defaultGpuSliderKey = 'default-gpu';
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
