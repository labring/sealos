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
      [DBTypeEnum.mysql, new MysqlLogParser(k8sExec, namespace)],
      [DBTypeEnum.notapemysql, new MysqlLogParser(k8sExec, namespace)]
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
    startTime?: number;
    endTime?: number;
  }): Promise<LogResult> {
    const parser = this.parsers.get(params.dbType);
    if (!parser) {
      throw new Error(`Unsupported database type: ${params.dbType}`);
    }
    return parser.readLogs(params);
  }

  async getLogCounts(params: {
    podName: string;
    dbType: DBTypeEnum;
    logType: LogTypeEnum;
    logPath?: string;
    startTime?: number;
    endTime?: number;
    timeRange?: string;
  }): Promise<{ logs_total: string; _time: string }[]> {
    // For now, return mock data based on time range
    // In a real implementation, this would query the actual log system
    const now = Date.now();
    const timeRangeMs = this.getTimeRangeMs(params.timeRange || '1h');
    const startTime = params.startTime || now - timeRangeMs;
    const endTime = params.endTime || now;

    // Generate mock data points every 5 minutes
    const interval = 5 * 60 * 1000; // 5 minutes in milliseconds
    const dataPoints: { logs_total: string; _time: string }[] = [];

    for (let time = startTime; time <= endTime; time += interval) {
      // Generate random log count between 10-100
      const logCount = Math.floor(Math.random() * 90) + 10;
      dataPoints.push({
        logs_total: logCount.toString(),
        _time: new Date(time).toISOString()
      });
    }

    return dataPoints;
  }

  private getTimeRangeMs(timeRange: string): number {
    const unit = timeRange.slice(-1);
    const value = parseInt(timeRange.slice(0, -1));

    switch (unit) {
      case 'm':
        return value * 60 * 1000; // minutes
      case 'h':
        return value * 60 * 60 * 1000; // hours
      case 'd':
        return value * 24 * 60 * 60 * 1000; // days
      default:
        return 60 * 60 * 1000; // default 1 hour
    }
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
