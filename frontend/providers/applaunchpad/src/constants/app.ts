export enum AppStatusEnum {
  running = 'running',
  waiting = 'waiting',
  error = 'error',
  pause = 'pause'
}
export const appStatusMap = {
  [AppStatusEnum.running]: {
    label: 'Running',
    value: AppStatusEnum.running,
    color: '#00A9A6',
    backgroundColor: '#E6F6F6',
    dotColor: '#00A9A6'
  },
  [AppStatusEnum.waiting]: {
    label: 'Creating',
    value: AppStatusEnum.waiting,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [AppStatusEnum.error]: {
    label: 'Abnormality Detected',
    value: AppStatusEnum.error,
    color: '#FF5B6E',
    backgroundColor: '#FFEBED',
    dotColor: '#FF5B6E'
  },
  [AppStatusEnum.pause]: {
    label: 'Paused',
    value: AppStatusEnum.pause,
    color: '#8172D8',
    backgroundColor: '#F2F1FB',
    dotColor: '#8172D8'
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
    color: '#00A9A6'
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

export const pauseKey = 'deploy.cloud.sealos.io/pause';
export const maxReplicasKey = 'deploy.cloud.sealos.io/maxReplicas';
export const minReplicasKey = 'deploy.cloud.sealos.io/minReplicas';
