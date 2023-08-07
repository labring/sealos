import { DBEditType, DBDetailType, PodDetailType } from '@/types/db';
import { CpuSlideMarkList, MemorySlideMarkList } from './editApp';

export const crLabelKey = 'sealos-db-provider-cr';

export enum DBTypeEnum {
  postgresql = 'postgresql',
  mongodb = 'mongodb',
  mysql = 'apecloud-mysql',
  redis = 'redis'
}

export enum DBStatusEnum {
  Creating = 'Creating',
  Starting = 'Starting',
  Stopping = 'Stopping',
  Stopped = 'Stopped',
  Running = 'Running',
  Updating = 'Updating',
  SpecUpdating = 'SpecUpdating',
  Rebooting = 'Rebooting',
  Upgrade = 'Upgrade',
  VerticalScaling = 'VerticalScaling',
  VolumeExpanding = 'VolumeExpanding',
  Failed = 'Failed',
  UnKnow = 'UnKnow'
}
export const dbStatusMap = {
  [DBStatusEnum.Creating]: {
    label: 'Creating',
    value: DBStatusEnum.Creating,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [DBStatusEnum.Starting]: {
    label: 'Starting',
    value: DBStatusEnum.Starting,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [DBStatusEnum.Stopping]: {
    label: 'Pausing',
    value: DBStatusEnum.Stopping,
    color: '#8172D8',
    backgroundColor: '#F2F1FB',
    dotColor: '#8172D8'
  },
  [DBStatusEnum.Stopped]: {
    label: 'Paused',
    value: DBStatusEnum.Stopped,
    color: '#8172D8',
    backgroundColor: '#F2F1FB',
    dotColor: '#8172D8'
  },
  [DBStatusEnum.Running]: {
    label: 'Running',
    value: DBStatusEnum.Running,
    color: '#00A9A6',
    backgroundColor: '#E6F6F6',
    dotColor: '#00A9A6'
  },
  [DBStatusEnum.Updating]: {
    label: 'Updating',
    value: DBStatusEnum.Updating,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [DBStatusEnum.SpecUpdating]: {
    label: 'Updating',
    value: DBStatusEnum.SpecUpdating,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [DBStatusEnum.Rebooting]: {
    label: 'Restarting',
    value: DBStatusEnum.Rebooting,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [DBStatusEnum.Upgrade]: {
    label: 'Updating',
    value: DBStatusEnum.Upgrade,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [DBStatusEnum.VerticalScaling]: {
    label: 'Updating',
    value: DBStatusEnum.VerticalScaling,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [DBStatusEnum.VolumeExpanding]: {
    label: 'Updating',
    value: DBStatusEnum.VolumeExpanding,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [DBStatusEnum.Failed]: {
    label: 'Failed',
    value: DBStatusEnum.Failed,
    color: '#FF5B6E',
    backgroundColor: '#FFEBED',
    dotColor: '#FF5B6E'
  },
  [DBStatusEnum.UnKnow]: {
    label: 'Creating',
    value: DBStatusEnum.UnKnow,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  }
};

/* pod */
export enum PodStatusEnum {
  waiting = 'waiting',
  running = 'running',
  terminated = 'terminated'
}
export const podStatusMap = {
  [PodStatusEnum.running]: {
    label: 'running',
    value: PodStatusEnum.running,
    bg: '#47C8BF'
  },
  [PodStatusEnum.waiting]: {
    label: 'waiting',
    value: PodStatusEnum.waiting,
    bg: '#D5D6E1'
  },
  [PodStatusEnum.terminated]: {
    label: 'terminated',
    value: PodStatusEnum.terminated,
    bg: '#9A8EE0'
  }
};

export const pauseKey = 'deploy.cloud.sealos.io/Stopped';
export const maxReplicasKey = 'deploy.cloud.sealos.io/maxReplicas';
export const minReplicasKey = 'deploy.cloud.sealos.io/minReplicas';

export const DBTypeList = [
  { id: DBTypeEnum.postgresql, label: 'postgres' },
  { id: DBTypeEnum.mongodb, label: 'mongo' },
  { id: DBTypeEnum.mysql, label: 'mysql' },
  { id: DBTypeEnum.redis, label: 'redis' }
];
export const DBComponentNameMap = {
  [DBTypeEnum.postgresql]: 'postgresql',
  [DBTypeEnum.mongodb]: 'mongo',
  [DBTypeEnum.mysql]: 'mysql',
  [DBTypeEnum.redis]: 'redis'
};
export const DBBackupPolicyNameMap = {
  [DBTypeEnum.postgresql]: 'postgresql',
  [DBTypeEnum.mongodb]: 'mongodb',
  [DBTypeEnum.mysql]: 'mysql',
  [DBTypeEnum.redis]: 'redis'
};

export const defaultDBEditValue: DBEditType = {
  dbType: DBTypeEnum.postgresql,
  dbVersion: '',
  dbName: '',
  replicas: 1,
  cpu: CpuSlideMarkList[1].value,
  memory: MemorySlideMarkList[1].value,
  storage: 3
};

export const defaultDBDetail: DBDetailType = {
  ...defaultDBEditValue,
  id: '',
  createTime: '2022/1/22',
  status: dbStatusMap.Creating,
  conditions: []
};

export const defaultPod: PodDetailType = {
  podName: '',
  status: [],
  nodeName: '',
  ip: '',
  restarts: 0,
  age: '1s',
  cpu: 1,
  memory: 1
};

export const RedisHAConfig = (ha = true) => {
  if (ha) {
    return {
      cpu: 200,
      memory: 200,
      storage: 1,
      replicas: 3
    };
  }
  return {
    cpu: 100,
    memory: 100,
    storage: 0,
    replicas: 1
  };
};
