import * as k8s from '@kubernetes/client-node';
import { ILogParser, LogParserParams, LogResult, PgLogEntry } from '@/types/log';
import { KubeFileSystem } from '@/utils/kubeFileSystem';
import Papa from 'papaparse';

export class PostgresLogParser implements ILogParser {
  constructor(private k8sExec: k8s.Exec, private namespace: string) {}

  async readLogs(params: LogParserParams): Promise<LogResult> {
    const { podName, containerNames, logPath, page, pageSize, keyword = 'CST' } = params;
    const start = performance.now();

    const totalCount = await this.getKeywordCount(podName, containerNames, logPath, keyword);

    if (totalCount === 0) {
      return this.emptyResult(page, pageSize);
    }

    const startIndex = (page - 1) * pageSize + 1;
    const endIndex = Math.min(page * pageSize, totalCount);

    const { startLine, endLine } = await this.getLineNumbersForRange(
      podName,
      containerNames,
      logPath,
      keyword,
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

    const logs = this.parsePostgresLogs(data);
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

  private parsePostgresLogs(logString: string): PgLogEntry[] {
    if (!logString.trim()) {
      return [];
    }

    const parsed = Papa.parse<string[]>(logString, {
      skipEmptyLines: true,
      header: false
    });

    // parsed.data.forEach((row) => {
    //   console.log(row, 'row');
    // });

    return parsed.data
      .filter((row) => row[0])
      .map((row) => ({
        timestamp: row[0].replace(/^"|"$/g, ''),
        level: 'INFO',
        content: row.slice(1).join(',')
      }));
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
