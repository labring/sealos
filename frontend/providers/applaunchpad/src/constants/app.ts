export enum AppStatusEnum {
  running = 'running',
  waiting = 'waiting',
  error = 'error',
  pause = 'pause'
}
export const appStatusMap = {
  [AppStatusEnum.running]: {
    label: '运行中',
    value: AppStatusEnum.running,
    color: '#00A9A6',
    backgroundColor: '#E6F6F6',
    dotColor: '#00A9A6'
  },
  [AppStatusEnum.waiting]: {
    label: '创建中',
    value: AppStatusEnum.waiting,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [AppStatusEnum.error]: {
    label: '有异常',
    value: AppStatusEnum.error,
    color: '#FF5B6E',
    backgroundColor: '#FFEBED',
    dotColor: '#FF5B6E'
  },
  [AppStatusEnum.pause]: {
    label: '已暂停',
    value: AppStatusEnum.pause,
    color: '#8172D8',
    backgroundColor: '#F2F1FB',
    dotColor: '#8172D8'
  }
};

export enum PodStatusEnum {
  Pending = 'Pending',
  Running = 'Running',
  Failed = 'Failed',
  Unknown = 'Unknown'
}
export const podStatusMap = {
  [PodStatusEnum.Running]: {
    label: 'Running',
    value: PodStatusEnum.Running,
    color: '#00A9A6'
  },
  [PodStatusEnum.Pending]: {
    label: 'Pending',
    value: PodStatusEnum.Pending,
    color: '#787A90'
  },
  [PodStatusEnum.Failed]: {
    label: 'Failed',
    value: PodStatusEnum.Failed,
    color: '#FF5B6E'
  },
  [PodStatusEnum.Unknown]: {
    label: 'Unknown',
    value: PodStatusEnum.Unknown,
    color: '#FF5B6E'
  }
};

export const pauseKey = 'deploy.cloud.sealos.io/pause';
export const maxReplicasKey = 'deploy.cloud.sealos.io/maxReplicas';
export const minReplicasKey = 'deploy.cloud.sealos.io/minReplicas';
