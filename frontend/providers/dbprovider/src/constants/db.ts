import {
  DBComponentsName,
  DBDetailType,
  DBEditType,
  DBSourceType,
  DBType,
  ParameterConfigField,
  ParameterFieldMetadata,
  PodDetailType,
  ReconfigStatusMapType
} from '@/types/db';
import { I18nCommonKey } from '@/types/i18next';
import { CpuSlideMarkList, MemorySlideMarkList } from './editApp';

export const crLabelKey = 'sealos-db-provider-cr';
export const CloudMigraionLabel = 'sealos-db-provider-cr-migrate';
export const KBMigrationTaskLabel = 'datamigration.apecloud.io/migrationtask';
export const KBBackupNameLabel = 'dataprotection.kubeblocks.io/backup-name';
export const SealosMigrationTaskLabel = 'datamigration.sealos.io/file-migration-task';
export const MigrationRemark = 'migration-remark';
export const DBPreviousConfigKey = 'cloud.sealos.io/previous-config';
export const templateDeployKey = 'cloud.sealos.io/deploy-on-sealos';
export const sealafDeployKey = 'sealaf-app';
export const DBReconfigureKey = 'ops.kubeblocks.io/ops-type=Reconfiguring';
export const DBSwitchRoleKey = 'ops.kubeblocks.io/ops-type=Switchover';

export const DBNameLabel = 'app.kubernetes.io/instance';

export enum DBTypeEnum {
  postgresql = 'postgresql',
  mongodb = 'mongodb',
  mysql = 'apecloud-mysql',
  notapemysql = 'mysql',
  redis = 'redis',
  kafka = 'kafka',
  qdrant = 'qdrant',
  nebula = 'nebula',
  weaviate = 'weaviate',
  milvus = 'milvus',
  pulsar = 'pulsar',
  clickhouse = 'clickhouse'
}

export const DB_REMARK_KEY = 'cloud.sealos.io/remark';

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
    bg: '#6CD99F'
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
  { id: DBTypeEnum.postgresql, label: 'PostgreSQL' },
  { id: DBTypeEnum.mongodb, label: 'MongoDB' },
  { id: DBTypeEnum.mysql, label: 'MySQL' },
  { id: DBTypeEnum.notapemysql, label: 'MySQL' },
  { id: DBTypeEnum.redis, label: 'Redis' },
  { id: DBTypeEnum.kafka, label: 'Kafka' },
  { id: DBTypeEnum.milvus, label: 'Milvus' },
  // { id: DBTypeEnum.qdrant, label: 'qdrant' },
  // { id: DBTypeEnum.pulsar, label: 'pulsar' },
  { id: DBTypeEnum.clickhouse, label: 'clickhouse' }
  // { id: DBTypeEnum.nebula, label: 'nebula' },
  // { id: DBTypeEnum.weaviate, label: 'weaviate' }
];

export const DBComponentNameMap: Record<DBType, Array<DBComponentsName>> = {
  [DBTypeEnum.postgresql]: ['postgresql'],
  [DBTypeEnum.mongodb]: ['mongodb'],
  [DBTypeEnum.mysql]: ['mysql'],
  [DBTypeEnum.notapemysql]: ['mysql'],
  [DBTypeEnum.redis]: ['redis', 'redis-sentinel'],
  [DBTypeEnum.kafka]: ['kafka-server', 'kafka-broker', 'controller', 'kafka-exporter'],
  [DBTypeEnum.qdrant]: ['qdrant'],
  [DBTypeEnum.nebula]: ['nebula-console', 'nebula-graphd', 'nebula-metad', 'nebula-storaged'],
  [DBTypeEnum.weaviate]: ['weaviate'],
  [DBTypeEnum.milvus]: ['milvus', 'etcd', 'minio'],
  [DBTypeEnum.pulsar]: ['bookies', 'pulsar-proxy', 'zookeeper'],
  [DBTypeEnum.clickhouse]: ['ch-keeper', 'clickhouse', 'zookeeper']
};

export const DBBackupPolicyNameMap = {
  [DBTypeEnum.postgresql]: 'postgresql',
  [DBTypeEnum.mongodb]: 'mongodb',
  [DBTypeEnum.mysql]: 'mysql',
  [DBTypeEnum.notapemysql]: 'mysql',
  [DBTypeEnum.redis]: 'redis',
  [DBTypeEnum.kafka]: 'kafka',
  [DBTypeEnum.qdrant]: 'qdrant',
  [DBTypeEnum.nebula]: 'nebula',
  [DBTypeEnum.weaviate]: 'weaviate',
  [DBTypeEnum.milvus]: 'milvus',
  [DBTypeEnum.pulsar]: 'pulsar',
  [DBTypeEnum.clickhouse]: 'clickhouse'
};

export const DBBackupMethodNameMap = {
  [DBTypeEnum.postgresql]: 'pg-basebackup',
  [DBTypeEnum.mongodb]: 'dump',
  [DBTypeEnum.mysql]: 'xtrabackup',
  [DBTypeEnum.notapemysql]: 'xtrabackup',
  [DBTypeEnum.redis]: 'datafile',
  // not support
  [DBTypeEnum.kafka]: 'kafka',
  [DBTypeEnum.qdrant]: 'qdrant',
  [DBTypeEnum.nebula]: 'nebula',
  [DBTypeEnum.weaviate]: 'weaviate',
  [DBTypeEnum.milvus]: 'milvus',
  [DBTypeEnum.pulsar]: 'pulsar',
  [DBTypeEnum.clickhouse]: 'clickhouse'
};

export const defaultDBEditValue: DBEditType = {
  dbType: DBTypeEnum.postgresql,
  dbVersion: 'postgresql-14.8.0',
  dbName: 'test-db',
  replicas: 1,
  cpu: CpuSlideMarkList[1].value,
  memory: MemorySlideMarkList[1].value,
  storage: 3,
  labels: {},
  autoBackup: {
    start: true,
    type: 'day',
    week: [],
    hour: '12',
    minute: '00',
    saveTime: 14,
    saveType: 'd'
  },
  terminationPolicy: 'Delete',
  parameterConfig: {
    maxConnections: undefined,
    timeZone: 'UTC',
    lowerCaseTableNames: '0',
    isMaxConnectionsCustomized: false
  }
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

export const defaultDBDetail: DBDetailType = {
  ...defaultDBEditValue,
  id: '',
  createTime: '2022/1/22',
  status: dbStatusMap.Creating,
  conditions: [],
  isDiskSpaceOverflow: false,
  labels: {},
  source: {
    hasSource: false,
    sourceName: '',
    sourceType: 'app_store'
  },
  totalCpu: 0,
  totalMemory: 0,
  totalStorage: 0
};

export const MockDBSecret = {
  username: 'postgres',
  password: '9v7cvkwl',
  host: 'test-db-postgresql.namespace.svc',
  port: '5432',
  connection: 'postgresql://postgres:9v7cvkwl@test-db-postgresql.namespace.svc:5432'
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
  mysql: {
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
  },
  pulsar: {
    connectKey: 'pulsar'
  },
  clickhouse: {
    connectKey: 'clickhouse'
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
  mysql: {
    type: 'ini',
    configMapName: '-mysql-mysql-replication-config',
    configMapKey: 'my.cnf',
    reconfigureName: 'mysql-replication-config',
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
  },
  pulsar: {
    type: 'ini',
    configMapName: '',
    configMapKey: '',
    reconfigureName: '',
    reconfigureKey: ''
  },
  clickhouse: {
    type: 'ini',
    configMapName: '',
    configMapKey: '',
    reconfigureName: '',
    reconfigureKey: ''
  }
};

export const DBSourceConfigs: Array<{
  key: string;
  type: DBSourceType;
}> = [
  { key: templateDeployKey, type: 'app_store' },
  { key: sealafDeployKey, type: 'sealaf' }
];

export const SelectTimeList = new Array(60).fill(0).map((item, i) => {
  const val = i < 10 ? `0${i}` : `${i}`;
  return {
    id: val,
    label: val
  };
});

export const WeekSelectList: { label: I18nCommonKey; id: string }[] = [
  { label: 'Monday', id: '1' },
  { label: 'Tuesday', id: '2' },
  { label: 'Wednesday', id: '3' },
  { label: 'Thursday', id: '4' },
  { label: 'Friday', id: '5' },
  { label: 'Saturday', id: '6' },
  { label: 'Sunday', id: '0' }
];

export const BackupSupportedDBTypeList: DBType[] = [
  'postgresql',
  'mongodb',
  'apecloud-mysql',
  'mysql',
  'redis'
];

/**
 * Versioned field override configuration.
 * @description Key can be 'default' or specific version (e.g., '8.0', '5.7').
 * Version-specific configs override corresponding items in default config.
 */
export const ParameterFieldOverrides: Partial<
  Record<DBTypeEnum, Record<string, ParameterConfigField[]>>
> = {
  postgresql: {
    default: [
      {
        name: 'log_timezone',
        type: 'enum',
        values: ['UTC', 'Asia/Shanghai']
      },
      {
        name: 'timezone',
        type: 'enum',
        values: ['UTC', 'Asia/Shanghai']
      }
    ]
  },
  'apecloud-mysql': {
    default: [
      {
        name: 'mysqld.default-time-zone',
        type: 'enum',
        values: ['UTC', 'Asia/Shanghai']
      }
    ]
  },
  mysql: {
    default: [
      {
        name: 'mysqld.default-time-zone',
        type: 'enum',
        values: ['UTC', 'Asia/Shanghai']
      }
    ]
  }
};

/**
 * Versioned field metadata configuration.
 * @description Key can be 'default' or specific version (e.g., '8.0', '5.7').
 * Version-specific metadata overrides corresponding items in default metadata.
 * Default editable is false, only explicitly set editable: true fields are editable.
 */
export const ParameterFieldMetadataMap: Partial<
  Record<DBTypeEnum, Record<string, Record<string, ParameterFieldMetadata>>>
> = {
  'apecloud-mysql': {
    default: {
      'mysqld.binlog_cache_size': { editable: true },
      'mysqld.binlog_format': { editable: true },
      'mysqld.binlog_order_commits': { editable: true },
      'mysqld.binlog_row_image': { editable: true },
      'mysqld.connect_timeout': { editable: true },
      'mysqld.default_tmp_storage_engine': { editable: true },
      'mysqld.host_cache_size': { editable: true },
      'mysqld.innodb_buffer_pool_size': { editable: true },
      'mysqld.innodb_io_capacity': { editable: true },
      'mysqld.innodb_io_capacity_max': { editable: true },
      'mysqld.innodb_purge_threads': { editable: true },
      'mysqld.innodb_read_io_threads': { editable: true },
      'mysqld.innodb_redo_log_capacity': { editable: true },
      'mysqld.join_buffer_size': { editable: true },
      'mysqld.key_buffer_size': { editable: true },
      'mysqld.local_infile': { editable: true },
      'mysqld.log_error_verbosity': { editable: true },
      'mysqld.log_output': { editable: true },
      'mysqld.log_statements_unsafe_for_binlog': { editable: true },
      'mysqld.long_query_time': { editable: true },
      'mysqld.max_connections': { editable: true },
      'mysqld.max_prepared_stmt_count': { editable: true },
      'mysqld.read_buffer_size': { editable: true },
      'mysqld.read_rnd_buffer_size': { editable: true },
      'mysqld.sort_buffer_size': { editable: true },
      'mysqld.sql_mode': { editable: true },
      'mysqld.table_open_cache': { editable: true },
      'mysqld.thread_cache_size': { editable: true },
      'mysqld.default-time-zone': { editable: true }
    }
  },
  mysql: {
    default: {
      'mysqld.long_query_time': { editable: true },
      'mysqld.max_connections': { editable: true },
      'mysqld.table_open_cache': { editable: true },
      'mysqld.max_prepared_stmt_count': { editable: true },
      'mysqld.read_buffer_size': { editable: true },
      'mysqld.read_rnd_buffer_size': { editable: true },
      'mysqld.join_buffer_size': { editable: true },
      'mysqld.sort_buffer_size': { editable: true },
      'mysqld.host_cache_size': { editable: true },
      'mysqld.connect_timeout': { editable: true },
      'mysqld.log_statements_unsafe_for_binlog': { editable: true },
      'mysqld.log_error_verbosity': { editable: true },
      'mysqld.innodb_io_capacity': { editable: true },
      'mysqld.innodb_io_capacity_max': { editable: true },
      'mysqld.innodb_purge_threads': { editable: true },
      'mysqld.innodb_read_io_threads': { editable: true },
      'mysqld.key_buffer_size': { editable: true },
      'mysqld.binlog_cache_size': { editable: true },
      'mysqld.binlog_format': { editable: true },
      'mysqld.binlog_row_image': { editable: true },
      'mysqld.binlog_order_commits': { editable: true },
      'mysqld.relay_log_recovery': { editable: true }
    }
  },
  postgresql: {
    default: {
      archive_mode: { editable: true },
      autovacuum_max_workers: { editable: true },
      autovacuum_work_mem: { editable: true },
      backend_flush_after: { editable: true },
      bgwriter_delay: { editable: true },
      bgwriter_flush_after: { editable: true },
      bgwriter_lru_maxpages: { editable: true },
      bgwriter_lru_multiplier: { editable: true },
      huge_pages: { editable: true },
      max_connections: { editable: true },
      max_files_per_process: { editable: true },
      max_locks_per_transaction: { editable: true },
      max_parallel_workers: { editable: true },
      max_pred_locks_per_page: { editable: true },
      max_pred_locks_per_relation: { editable: true },
      max_pred_locks_per_transaction: { editable: true },
      max_prepared_transactions: { editable: true },
      max_replication_slots: { editable: true },
      max_stack_depth: { editable: true },
      max_wal_senders: { editable: true },
      max_worker_processes: { editable: true },
      shared_buffers: { editable: true },
      shared_preload_libraries: { editable: true },
      superuser_reserved_connections: { editable: true },
      wal_buffers: { editable: true },
      wal_level: { editable: true },
      wal_init_zero: { editable: true }
    }
  },
  mongodb: {
    default: {
      // No params are allowed to be modified for MongoDB
    }
  }
};
