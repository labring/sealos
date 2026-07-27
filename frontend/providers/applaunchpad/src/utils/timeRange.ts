import { subHours, subDays, subMinutes, subMonths } from 'date-fns';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';

dayjs.extend(customParseFormat);
dayjs.extend(utc);

type TimeUnit = 'h' | 'm' | 'd' | 'M';

interface TimeRange {
  startTime: Date;
  endTime: Date;
}

const UTC_DATE_FORMAT = 'YYYY-MM-DD';
const UTC_TIME_FORMAT = 'HH:mm:ss';

export function formatUtcDate(date: Date): string {
  return dayjs(date).utc().format(UTC_DATE_FORMAT);
}

export function formatUtcTime(date: Date): string {
  return dayjs(date).utc().format(UTC_TIME_FORMAT);
}

export function formatUtcDateTime(date: Date | string | number, format = 'YYYY-MM-DD HH:mm:ss') {
  return dayjs(date).utc().format(format);
}

export function normalizeTimeInput(value: string): string {
  return /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
}

export function parseUtcDateTime(date: string, time: string): Date | null {
  const parsed = dayjs.utc(
    `${date} ${normalizeTimeInput(time)}`,
    `${UTC_DATE_FORMAT} ${UTC_TIME_FORMAT}`,
    true
  );

  return parsed.isValid() ? parsed.toDate() : null;
}

/**
 * Parse time range string
 * @param range Time range string, e.g. "1h", "7d", "30m", "1M"
 * @param endTime End time, defaults to current time
 * @returns Object containing start and end time
 */
export function parseTimeRange(range: string, endTime: Date = new Date()): TimeRange {
  const match = range.match(/^(\d+)([hmdM])$/i);
  if (!match) {
    throw new Error('Invalid time range format. Supported formats: 1h, 7d, 30m, 1M');
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase() as TimeUnit;

  let startTime: Date;
  switch (unit) {
    case 'h':
      startTime = subHours(endTime, value);
      break;
    case 'm':
      startTime = subMinutes(endTime, value);
      break;
    case 'd':
      startTime = subDays(endTime, value);
      break;
    case 'M':
      startTime = subMonths(endTime, value);
      break;
    default:
      throw new Error('Unsupported time unit');
  }

  return {
    startTime,
    endTime
  };
}

/**
 * Convert time range to string format
 * @param startTime Start time
 * @param endTime End time
 * @returns Time range string, e.g. "1h", "7d"
 */
export function formatTimeRange(startTime: Date, endTime: Date): string {
  const diffMs = endTime.getTime() - startTime.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30));

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  } else if (diffHours < 24) {
    return `${diffHours}h`;
  } else if (diffDays === 1) {
    return '24h';
  } else if (diffDays < 30) {
    return `${diffDays}d`;
  } else {
    return `${diffMonths}M`;
  }
}
