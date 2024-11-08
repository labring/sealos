import { DBTypeEnum } from '@/constants/db';
import { LogTypeEnum } from '@/constants/log';

export interface BaseLogEntry {
  timestamp: string;
  level: string;
  content: string;
}

export interface PgLogEntry extends BaseLogEntry {}

export interface MysqlLogEntry extends BaseLogEntry {}

export interface RedisLogEntry extends BaseLogEntry {
  processId: string;
  role: string;
}

export interface MongoLogEntry extends BaseLogEntry {
  component: string;
  context: string;
  connectionId?: string;
}

export interface LogResult {
  logs: BaseLogEntry[];
  metadata: {
    total: number;
    page: number;
    pageSize: number;
    processingTime: string;
    hasMore: boolean;
  };
}

export type LogParserParams = {
  podName: string;
  containerNames: string[];
  logPath: string;
  page: number;
  pageSize: number;
  dbType: DBTypeEnum;
  keyword?: string;
  logType?: LogTypeEnum;
};

export interface ILogParser {
  readLogs(params: LogParserParams): Promise<LogResult>;
}
