import Papa from 'papaparse';

interface LogEntry {
  timestamp: string;
  level?: string;
  source?: string;
  content: string;
  raw: string;
}

class EnhancedLogParser {
  private static readonly LOG_PATTERN =
    /^(\d+):([A-Z])\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+([*#])\s+(.+)$/;

  constructor(
    private readonly options: {
      includeRaw?: boolean;
      timezone?: string;
    } = {}
  ) {}

  parseLogString(logString: string): LogEntry[] {
    if (!logString.trim()) {
      return [];
    }

    // 首先尝试作为CSV解析
    try {
      if (this.isCSVFormat(logString)) {
        return this.parseCSV(logString);
      }
    } catch (error) {
      console.warn('CSV parsing failed, trying standard log format');
    }

    // 如果不是CSV或CSV解析失败，按普通日志解析
    return this.parseStandardLog(logString);
  }

  private isCSVFormat(logString: string): boolean {
    const firstLine = logString.split('\n')[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    return commaCount > 0;
  }

  private parseCSV(logString: string): LogEntry[] {
    const parsed = Papa.parse<string[]>(logString, {
      skipEmptyLines: true,
      header: false
    });

    return parsed.data
      .filter((row) => row[0])
      .map((row) => ({
        timestamp: row[0].replace(/^"|"$/g, ''),
        content: row.slice(1).join(','),
        raw: this.options.includeRaw ? row.join(',') : ''
      }));
  }

  private parseStandardLog(logString: string): LogEntry[] {
    return logString
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => this.parseLogLine(line))
      .filter((entry): entry is LogEntry => entry !== null);
  }

  private parseLogLine(line: string): LogEntry | null {
    try {
      const match = line.match(EnhancedLogParser.LOG_PATTERN);

      if (!match) {
        // 如果不匹配标准格式，返回基础日志条目
        return {
          timestamp: new Date().toISOString(),
          content: line.trim(),
          raw: this.options.includeRaw ? line : ''
        };
      }

      const [, processId, role, timestamp, level, content] = match;

      return {
        timestamp: this.normalizeTimestamp(timestamp),
        level: level === '#' ? 'WARNING' : 'INFO',
        source: `${processId}:${role}`,
        content: content.trim(),
        raw: this.options.includeRaw ? line : ''
      };
    } catch (error) {
      console.error('Error parsing log line:', error);
      return null;
    }
  }

  private normalizeTimestamp(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      if (this.options.timezone) {
        return date.toLocaleString('en-US', { timeZone: this.options.timezone });
      }
      return date.toISOString();
    } catch {
      return timestamp;
    }
  }

  filterByTimeRange(entries: LogEntry[], startTime: Date, endTime: Date): LogEntry[] {
    return entries.filter((entry) => {
      try {
        const entryTime = new Date(entry.timestamp);
        return entryTime >= startTime && entryTime <= endTime;
      } catch {
        return false;
      }
    });
  }

  filterByLevel(entries: LogEntry[], level: string): LogEntry[] {
    return entries.filter((entry) => entry.level === level);
  }

  filterByContent(entries: LogEntry[], searchText: string): LogEntry[] {
    const searchLower = searchText.toLowerCase();
    return entries.filter((entry) => entry.content.toLowerCase().includes(searchLower));
  }
}

export { EnhancedLogParser, type LogEntry };
