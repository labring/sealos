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
  Commands = 'commands'
}

export interface DatabaseQueryParams extends BaseQueryParams {
  query: string;
  type: DatabaseType;
  app: string;
}
