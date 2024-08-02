import { DBEditType, DBDetailType, PodDetailType, DBType, ReconfigStatusMapType } from '@/types/db';
import { CpuSlideMarkList, MemorySlideMarkList } from './editApp';

export const crLabelKey = 'sealos-db-provider-cr';
export const CloudMigraionLabel = 'sealos-db-provider-cr-migrate';
export const KBMigrationTaskLabel = 'datamigration.apecloud.io/migrationtask';
export const KBBackupNameLabel = 'dataprotection.kubeblocks.io/backup-name';
export const SealosMigrationTaskLabel = 'datamigration.sealos.io/file-migration-task';
export const MigrationRemark = 'migration-remark';
export const DBPreviousConfigKey = 'cloud.sealos.io/previous-config';
export const templateDeployKey = 'cloud.sealos.io/deploy-on-sealos';
export const DBReconfigureKey = 'ops.kubeblocks.io/ops-type=Reconfiguring';

export enum DBTypeEnum {
  postgresql = 'postgresql',
  mongodb = 'mongodb',
  mysql = 'apecloud-mysql',
  redis = 'redis',
  kafka = 'kafka',
  qdrant = 'qdrant',
  nebula = 'nebula',
  weaviate = 'weaviate',
  milvus = 'milvus'
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
  UnKnow = 'UnKnow',
  Deleting = 'Deleting'
}

export enum ReconfigStatus {
  Deleting = 'Deleting',
  Creating = 'Creating',
  Running = 'Running',
  Succeed = 'Succeed',
  Failed = 'Failed'
}

export const DBReconfigStatusMap: Record<`${ReconfigStatus}`, ReconfigStatusMapType> = {
  [ReconfigStatus.Deleting]: {
    label: 'Deleting',
    value: ReconfigStatus.Deleting,
    color: '#DC6803'
  },
  [ReconfigStatus.Creating]: {
    label: 'Creating',
    value: ReconfigStatus.Creating,
    color: '#667085'
  },
  [ReconfigStatus.Running]: {
    label: 'Running',
    value: ReconfigStatus.Running,
    color: '#667085'
  },
  [ReconfigStatus.Succeed]: {
    label: 'Success',
    value: ReconfigStatus.Succeed,
    color: '#039855'
  },
  [ReconfigStatus.Failed]: {
    label: 'Failed',
    value: ReconfigStatus.Failed,
    color: '#F04438'
  }
};

export const dbStatusMap = {
  [DBStatusEnum.Creating]: {
    label: 'Creating',
    value: DBStatusEnum.Creating,
    color: 'grayModern.500',
    backgroundColor: 'rgba(17, 24, 36, 0.05)',
    dotColor: 'grayModern.500'
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
    color: '#6F5DD7',
    backgroundColor: '#F0EEFF',
    dotColor: '#6F5DD7'
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
    color: '#039855',
    backgroundColor: '#EDFBF3',
    dotColor: '#039855'
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
    color: '#F04438',
    backgroundColor: '#FEF3F2',
    dotColor: '#F04438'
  },
  [DBStatusEnum.UnKnow]: {
    label: 'Creating',
    value: DBStatusEnum.UnKnow,
    color: '#787A90',
    backgroundColor: '#F5F5F8',
    dotColor: '#787A90'
  },
  [DBStatusEnum.Deleting]: {
    label: 'Deleting',
    value: DBStatusEnum.Deleting,
    color: '#DC6803',
    backgroundColor: '#FFFAEB',
    dotColor: '#DC6803'
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
  { id: DBTypeEnum.redis, label: 'redis' },
  { id: DBTypeEnum.kafka, label: 'kafka' },
  { id: DBTypeEnum.milvus, label: 'milvus' }
  // { id: DBTypeEnum.qdrant, label: 'qdrant' },
  // { id: DBTypeEnum.nebula, label: 'nebula' },
  // { id: DBTypeEnum.weaviate, label: 'weaviate' }
];

export const DBComponentNameMap = {
  [DBTypeEnum.postgresql]: 'postgresql',
  [DBTypeEnum.mongodb]: 'mongodb',
  [DBTypeEnum.mysql]: 'mysql',
  [DBTypeEnum.redis]: 'redis',
  [DBTypeEnum.kafka]: 'kafka',
  [DBTypeEnum.qdrant]: 'qdrant',
  [DBTypeEnum.nebula]: 'nebula',
  [DBTypeEnum.weaviate]: 'weaviate',
  [DBTypeEnum.milvus]: 'milvus'
};

export const DBBackupPolicyNameMap = {
  [DBTypeEnum.postgresql]: 'postgresql',
  [DBTypeEnum.mongodb]: 'mongodb',
  [DBTypeEnum.mysql]: 'mysql',
  [DBTypeEnum.redis]: 'redis',
  [DBTypeEnum.kafka]: 'kafka',
  [DBTypeEnum.qdrant]: 'qdrant',
  [DBTypeEnum.nebula]: 'nebula',
  [DBTypeEnum.weaviate]: 'weaviate',
  [DBTypeEnum.milvus]: 'milvus'
};

export const DBBackupMethodNameMap = {
  [DBTypeEnum.postgresql]: 'pg-basebackup',
  [DBTypeEnum.mongodb]: 'dump',
  [DBTypeEnum.mysql]: 'xtrabackup',
  [DBTypeEnum.redis]: 'datafile',
  // not support
  [DBTypeEnum.kafka]: 'kafka',
  [DBTypeEnum.qdrant]: 'qdrant',
  [DBTypeEnum.nebula]: 'nebula',
  [DBTypeEnum.weaviate]: 'weaviate',
  [DBTypeEnum.milvus]: 'milvus'
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
  conditions: [],
  isDiskSpaceOverflow: false,
  labels: {}
};

export const defaultPod: PodDetailType = {
  podName: '',
  status: [],
  nodeName: '',
  ip: '',
  restarts: 0,
  age: '1s',
  cpu: 1,
  memory: 1,
  hostIp: ''
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

export const DBTypeSecretMap = {
  postgresql: {
    connectKey: 'postgresql'
  },
  mongodb: {
    connectKey: 'mongodb'
  },
  'apecloud-mysql': {
    connectKey: 'mysql'
  },
  redis: {
    connectKey: 'redis'
  },
  kafka: {
    connectKey: 'kafka'
  },
  qdrant: {
    connectKey: 'qdrant'
  },
  nebula: {
    connectKey: 'nebula'
  },
  weaviate: {
    connectKey: 'weaviate'
  },
  milvus: {
    connectKey: 'milvus'
  }
};

export const DBReconfigureMap: {
  [key in DBType]: {
    configMapKey: string;
    configMapName: string;
    type: 'yaml' | 'ini';
    reconfigureName: string;
    reconfigureKey: string;
  };
} = {
  postgresql: {
    configMapName: '-postgresql-postgresql-configuration',
    configMapKey: 'postgresql.conf',
    type: 'ini',
    reconfigureName: 'postgresql-configuration',
    reconfigureKey: 'postgresql.conf'
  },
  mongodb: {
    type: 'yaml',
    configMapName: '-mongodb-mongodb-config',
    configMapKey: 'mongodb.conf',
    reconfigureName: 'mongodb-config',
    reconfigureKey: 'mongodb.conf'
  },
  'apecloud-mysql': {
    type: 'ini',
    configMapName: '-mysql-mysql-consensusset-config',
    configMapKey: 'my.cnf',
    reconfigureName: 'mysql-consensusset-config',
    reconfigureKey: 'my.cnf'
  },
  redis: {
    type: 'ini',
    configMapName: '',
    configMapKey: '',
    reconfigureName: '',
    reconfigureKey: ''
  },
  kafka: {
    type: 'ini',
    configMapName: '',
    configMapKey: '',
    reconfigureName: '',
    reconfigureKey: ''
  },
  qdrant: {
    type: 'ini',
    configMapName: '',
    configMapKey: '',
    reconfigureName: '',
    reconfigureKey: ''
  },
  nebula: {
    type: 'ini',
    configMapName: '',
    configMapKey: '',
    reconfigureName: '',
    reconfigureKey: ''
  },
  weaviate: {
    type: 'ini',
    configMapName: '',
    configMapKey: '',
    reconfigureName: '',
    reconfigureKey: ''
  },
  milvus: {
    type: 'ini',
    configMapName: '',
    configMapKey: '',
    reconfigureName: '',
    reconfigureKey: ''
  }
};
