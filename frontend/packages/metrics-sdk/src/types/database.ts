import { BaseQueryParams } from './common';

export type DatabaseType =
  | 'apecloud-mysql'
  | 'postgresql'
  | 'mongodb'
  | 'redis'
  | 'kafka'
  | 'milvus';

export type CommonMetric =
  | 'cpu'
  | 'memory'
  | 'disk'
  | 'disk_capacity'
  | 'disk_used'
  | 'uptime'
  | 'connections'
  | 'commands'
  | 'innodb'
  | 'slow_queries'
  | 'aborted_connections'
  | 'table_locks'
  | 'db_size'
  | 'active_connections'
  | 'rollbacks'
  | 'commits'
  | 'tx_duration'
  | 'block_read_time'
  | 'block_write_time'
  | 'document_ops'
  | 'pg_faults'
  | 'db_items'
  | 'hits_ratio'
  | 'commands_duration'
  | 'blocked_connections'
  | 'key_evictions';

export interface DatabaseQueryParams extends BaseQueryParams {
  query: string;
  type: DatabaseType;
  app: string;
}
