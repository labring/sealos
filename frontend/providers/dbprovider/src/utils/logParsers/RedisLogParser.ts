import * as k8s from '@kubernetes/client-node';
import { ILogParser, LogParserParams, LogResult, RedisLogEntry } from '@/types/log';
import { KubeFileSystem } from '@/utils/kubeFileSystem';
import dayjs from 'dayjs';

export class RedisLogParser implements ILogParser {
  private static readonly REDIS_LOG_PATTERN =
    /^(\d+):([A-Z])\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+([*#])\s+(.+)$/;

  constructor(private k8sExec: k8s.Exec, private namespace: string) {}

  async readLogs(params: LogParserParams): Promise<LogResult> {
    const { podName, containerNames, logPath, page, pageSize } = params;
    const start = performance.now();

    try {
      const totalCount = await this.getRedisLogCount(podName, containerNames, logPath);

      if (totalCount === 0) {
        return this.emptyResult(page, pageSize);
      }

      const startLine = (page - 1) * pageSize + 1;
      const endLine = Math.min(page * pageSize, totalCount);

      const data = await this.readLogsFromContainers(
        podName,
        containerNames,
        logPath,
        startLine,
        endLine
      );

      const logs = this.parseRedisLogs(data);
      const end = performance.now();

      return {
        logs,
        metadata: {
          total: totalCount,
          page,
          pageSize,
          processingTime: `${(end - start).toFixed(2)}ms`,
          hasMore: endLine < totalCount
        }
      };
    } catch (error) {
      console.error('Error reading Redis logs:', error);
      throw error;
    }
  }

  private async getRedisLogCount(
    podName: string,
    containerNames: string[],
    logPath: string
  ): Promise<number> {
    const kubefs = new KubeFileSystem(this.k8sExec);

    for (const containerName of containerNames) {
      try {
        const result = await kubefs.execCommand(this.namespace, podName, containerName, [
          'wc',
          '-l',
          logPath
        ]);

        if (result) {
          const count = parseInt(result.trim().split(' ')[0], 10);
          return count;
        }
      } catch (error) {
        continue;
      }
    }
    return 0;
  }

  private async readLogsFromContainers(
    podName: string,
    containerNames: string[],
    logPath: string,
    startLine: number,
    endLine: number
  ): Promise<string> {
    const kubefs = new KubeFileSystem(this.k8sExec);

    for (const containerName of containerNames) {
      try {
        const data = await kubefs.execCommand(this.namespace, podName, containerName, [
          'sed',
          '-n',
          `${startLine},${endLine}p`,
          logPath
        ]);
        if (data) return data;
      } catch (error) {
        continue;
      }
    }
    return '';
  }

  private parseRedisLogs(logString: string): RedisLogEntry[] {
    return logString
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        // console.log(line, 'line');
        const match = line.match(RedisLogParser.REDIS_LOG_PATTERN);
        if (!match) {
          return {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            content: line.trim(),
            processId: '',
            role: ''
          };
        }

        const [, processId, role, timestamp, level, content] = match;
        return {
          processId,
          role,
          timestamp: dayjs(timestamp).add(8, 'hour').format('DD MMM YYYY HH:mm:ss.SSS'),
          level: level === '#' ? 'WARNING' : 'INFO',
          content: content.trim()
        };
      })
      .filter((entry): entry is RedisLogEntry => entry !== null);
  }

  private emptyResult(page: number, pageSize: number): LogResult {
    return {
      logs: [],
      metadata: {
        total: 0,
        page,
        pageSize,
        processingTime: '0ms',
        hasMore: false
      }
    };
  }
}
