import { BaseQueryParams } from './common';

export enum DatabaseType {
  MySQL = 'apecloud-mysql',
  PostgreSQL = 'postgresql',
  MongoDB = 'mongodb',
  Redis = 'redis',
  Kafka = 'kafka',
  Milvus = 'milvus'
}

export enum CommonMetric {
  CPU = 'cpu',
  Memory = 'memory',
  Disk = 'disk',
  DiskCapacity = 'disk_capacity',
  DiskUsed = 'disk_used',
  Uptime = 'uptime',
  Connections = 'connections',
  Commands = 'commands',
  InnoDB = 'innodb',
  SlowQueries = 'slow_queries',
  AbortedConnections = 'aborted_connections',
  TableLocks = 'table_locks',
  DbSize = 'db_size',
  ActiveConnections = 'active_connections',
  Rollbacks = 'rollbacks',
  Commits = 'commits',
  TxDuration = 'tx_duration',
  BlockReadTime = 'block_read_time',
  BlockWriteTime = 'block_write_time',
  DocumentOps = 'document_ops',
  PgFaults = 'pg_faults',
  DbItems = 'db_items',
  HitsRatio = 'hits_ratio',
  CommandsDuration = 'commands_duration',
  BlockedConnections = 'blocked_connections',
  KeyEvictions = 'key_evictions'
}

export interface DatabaseQueryParams extends BaseQueryParams {
  query: string;
  type: DatabaseType;
  app: string;
}
