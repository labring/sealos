import { DBTypeEnum } from '@/constants/db';
import { LogTypeEnum } from '@/constants/log';
import {
  BaseLogEntry,
  ILogParser,
  LogResult,
  MongoLogEntry,
  PgLogEntry,
  RedisLogEntry
} from '@/types/log';
import * as k8s from '@kubernetes/client-node';
import { MongoLogParser } from './MongoLogParser';
import { PostgresLogParser } from './PostgresLogParser';
import { RedisLogParser } from './RedisLogParser';
import { MysqlLogParser } from './MysqlLogParser';

class DatabaseLogService {
  private parsers: Map<DBTypeEnum, ILogParser>;

  constructor(
    private k8sExec: k8s.Exec,
    private k8sCore: k8s.CoreV1Api,
    private namespace: string
  ) {
    this.parsers = new Map<DBTypeEnum, ILogParser>([
      [DBTypeEnum.postgresql, new PostgresLogParser(k8sExec, namespace)],
      [DBTypeEnum.redis, new RedisLogParser(k8sExec, namespace)],
      [DBTypeEnum.mongodb, new MongoLogParser(k8sExec, k8sCore, namespace)],
      [DBTypeEnum.mysql, new MysqlLogParser(k8sExec, namespace)]
    ]);
  }

  async readLogs(params: {
    podName: string;
    containerNames: string[];
    logPath: string;
    page: number;
    pageSize: number;
    keyword?: string;
    dbType: DBTypeEnum;
    logType?: LogTypeEnum;
  }): Promise<LogResult> {
    const parser = this.parsers.get(params.dbType);
    if (!parser) {
      throw new Error(`Unsupported database type: ${params.dbType}`);
    }
    return parser.readLogs(params);
  }
}

export {
  DatabaseLogService,
  type BaseLogEntry,
  type LogResult,
  type MongoLogEntry,
  type PgLogEntry,
  type RedisLogEntry
};
