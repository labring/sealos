import { LogTypeEnum } from '@/constants/log';
import { ILogParser, LogParserParams, LogResult, MysqlLogEntry } from '@/types/log';
import { KubeFileSystem } from '@/utils/kubeFileSystem';
import * as k8s from '@kubernetes/client-node';

export class MysqlLogParser implements ILogParser {
  constructor(private k8sExec: k8s.Exec, private namespace: string) {}

  async readLogs(params: LogParserParams): Promise<LogResult> {
    const {
      podName,
      containerNames,
      logPath,
      page,
      pageSize,
      logType = LogTypeEnum.SlowQuery
    } = params;

    const start = performance.now();

    try {
      if (logType === LogTypeEnum.SlowQuery) {
        const totalCount = await this.getKeywordCount(podName, containerNames, logPath, 'Time');
        if (totalCount === 0) {
          return this.emptyResult(page, pageSize);
        }

        const startIndex = (page - 1) * pageSize + 1;
        const endIndex = Math.min(page * pageSize, totalCount);

        const { startLine, endLine } = await this.getLineNumbersForRange(
          podName,
          containerNames,
          logPath,
          'Time',
          startIndex,
          endIndex
        );

        if (!startLine || !endLine) {
          return this.emptyResult(page, pageSize);
        }

        const data = await this.readLogsFromContainers(
          podName,
          containerNames,
          logPath,
          startLine,
          endLine
        );

        const logs = this.parseSlowQueryLogs(data);
        const end = performance.now();

        return {
          logs,
          metadata: {
            total: totalCount,
            page,
            pageSize,
            processingTime: `${(end - start).toFixed(2)}ms`,
            hasMore: endIndex < totalCount
          }
        };
      } else {
        const totalCount = await this.getMysqlLogCount(podName, containerNames, logPath);
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

        const logs = this.parseErrorLogs(data);
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
      }
    } catch (error) {
      console.error('Error reading MySQL logs:', error);
      throw error;
    }
  }

  private async getKeywordCount(
    podName: string,
    containerNames: string[],
    logPath: string,
    keyword: string
  ): Promise<number> {
    const kubefs = new KubeFileSystem(this.k8sExec);

    for (const containerName of containerNames) {
      try {
        const result = await kubefs.execCommand(this.namespace, podName, containerName, [
          'grep',
          '-c',
          keyword,
          logPath
        ]);

        if (result) {
          return parseInt(result.trim(), 10);
        }
      } catch (error) {
        continue;
      }
    }
    return 0;
  }

  private async getLineNumbersForRange(
    podName: string,
    containerNames: string[],
    logPath: string,
    keyword: string,
    startIndex: number,
    endIndex: number
  ): Promise<{ startLine?: number; endLine?: number }> {
    const kubefs = new KubeFileSystem(this.k8sExec);

    for (const containerName of containerNames) {
      try {
        const awkCommand = `
          /${keyword}/ { 
            count++; 
            if (count == ${startIndex}) print NR; 
            if (count == ${endIndex}) { print NR; exit; }
          }
        `;

        const result = await kubefs.execCommand(this.namespace, podName, containerName, [
          'awk',
          awkCommand,
          logPath
        ]);

        if (result) {
          const lines = result.trim().split('\n');
          return {
            startLine: parseInt(lines[0], 10),
            endLine: lines[1] ? parseInt(lines[1], 10) : parseInt(lines[0], 10)
          };
        }
      } catch (error) {
        continue;
      }
    }
    return {};
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

  private async getMysqlLogCount(
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
          return parseInt(result.trim().split(' ')[0], 10);
        }
      } catch (error) {
        continue;
      }
    }
    return 0;
  }

  private parseSlowQueryLogs(logString: string): MysqlLogEntry[] {
    if (!logString.trim()) {
      return [];
    }

    const entries: MysqlLogEntry[] = [];
    const logs = logString.split('# Time:').filter(Boolean);

    for (const log of logs) {
      const lines = log.trim().split('\n');

      const timestampMatch = lines[0].trim().match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      if (timestampMatch) {
        const timestamp = lines[0].trim();
        const content = lines.slice(1).join('\n');

        entries.push({
          timestamp,
          level: 'INFO',
          content: content.trim()
        });
      }
    }

    return entries;
  }

  private parseErrorLogs(logString: string): MysqlLogEntry[] {
    return logString
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const match = line.match(
          /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(\d+)\s+\[([^\]]+)\]/
        );
        if (!match) {
          return {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            content: line.trim()
          };
        }

        const [, timestamp, processId, level] = match;
        let logLevel = 'INFO';
        if (level.includes('Warning')) logLevel = 'WARNING';
        if (level.includes('ERROR')) logLevel = 'ERROR';

        const content = line
          .substring(line.indexOf(']', line.indexOf(']', line.indexOf(']') + 1) + 1) + 1)
          .trim();

        return {
          timestamp,
          level: logLevel,
          content
        };
      })
      .filter((entry): entry is MysqlLogEntry => entry !== null);
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
