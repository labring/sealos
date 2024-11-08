import * as k8s from '@kubernetes/client-node';
import { ILogParser, LogParserParams, LogResult, MongoLogEntry } from '@/types/log';

export class MongoLogParser implements ILogParser {
  private static readonly MONGO_LOG_PATTERN =
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{4})\s+(\w+)\s+(\w+)\s+\[(\w+)]\s+(.+?)(?:\s+(?:connection:\s*(\d+)))?$/;

  constructor(
    private k8sExec: k8s.Exec,
    private k8sCore: k8s.CoreV1Api,
    private namespace: string
  ) {}

  async readLogs(params: LogParserParams): Promise<LogResult> {
    const { podName, containerNames, page, pageSize } = params;
    const start = performance.now();

    try {
      let logs: MongoLogEntry[] = [];
      let totalCount = 0;

      const oneDayInSeconds = 1 * 60 * 60;

      for (const containerName of containerNames) {
        try {
          const { body: logData } = await this.k8sCore.readNamespacedPodLog(
            podName,
            this.namespace,
            containerName,
            false,
            undefined,
            undefined,
            undefined,
            false,
            oneDayInSeconds,
            undefined,
            false
          );

          if (!logData) continue;

          const allLogs = this.parseMongoLogs(logData);
          totalCount = allLogs.length;

          const startIndex = (page - 1) * pageSize;
          const endIndex = startIndex + pageSize;
          logs = allLogs.slice(startIndex, endIndex);

          break;
        } catch (error) {
          continue;
        }
      }

      const end = performance.now();

      return {
        logs,
        metadata: {
          total: totalCount,
          page,
          pageSize,
          processingTime: `${(end - start).toFixed(2)}ms`,
          hasMore: page * pageSize < totalCount
        }
      };
    } catch (error) {
      console.error('Error reading MongoDB logs:', error);
      throw error;
    }
  }

  private parseMongoLogs(logString: string): MongoLogEntry[] {
    return logString
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const match = line.match(MongoLogParser.MONGO_LOG_PATTERN);
        if (!match) {
          return {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            component: 'unknown',
            context: 'unknown',
            content: line.trim()
          };
        }

        const [, timestamp, level, component, context, content, connectionId] = match;
        return {
          timestamp,
          level,
          component,
          context,
          content: content.trim(),
          connectionId
        };
      })
      .filter((entry): entry is MongoLogEntry => entry !== null);
  }
}
