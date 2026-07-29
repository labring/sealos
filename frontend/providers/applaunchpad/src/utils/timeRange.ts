import { subHours, subDays, subMinutes, subMonths } from 'date-fns';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

type TimeUnit = 'h' | 'm' | 'd' | 'M';

interface TimeRange {
  startTime: Date;
  endTime: Date;
}

const DATE_FORMAT = 'YYYY-MM-DD';
const TIME_FORMAT = 'HH:mm:ss';

const FALLBACK_TIME_ZONE = 'UTC';

export function getBrowserTimeZone(): string {
  if (typeof window === 'undefined') {
    return FALLBACK_TIME_ZONE;
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIME_ZONE;
}

function parseInstant(date: Date | string | number) {
  if (typeof date !== 'string') {
    return dayjs(date);
  }

  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(date);
  return hasTimeZone ? dayjs(date) : dayjs.utc(date);
}

export function formatDateInTimeZone(date: Date, timeZone: string): string {
  return dayjs(date).tz(timeZone).format(DATE_FORMAT);
}

export function formatTimeInTimeZone(date: Date, timeZone: string): string {
  return dayjs(date).tz(timeZone).format(TIME_FORMAT);
}

export function formatDateTimeInTimeZone(
  date: Date | string | number,
  timeZone: string,
  format = 'YYYY-MM-DD HH:mm:ss'
) {
  return parseInstant(date).tz(timeZone).format(format);
}

export function getUtcTimestamp(date: Date | string | number): number {
  return parseInstant(date).valueOf();
}

export function normalizeTimeInput(value: string): string {
  return /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
}

export function parseDateTimeInTimeZone(date: string, time: string, timeZone: string): Date | null {
  const input = `${date} ${normalizeTimeInput(time)}`;
  const format = `${DATE_FORMAT} ${TIME_FORMAT}`;
  if (!dayjs(input, format, true).isValid()) {
    return null;
  }

  const parsed = dayjs.tz(input, format, timeZone);

  // Day.js normalizes nonexistent wall-clock times during DST spring-forward.
  return parsed.format(format) === input ? parsed.toDate() : null;
}

export function getDayBoundsInTimeZone(date: Date, timeZone: string): { start: Date; end: Date } {
  const zonedDate = dayjs(date).tz(timeZone);

  return {
    start: zonedDate.startOf('day').toDate(),
    end: zonedDate.endOf('day').toDate()
  };
}

export function orderDateRange(first: Date, second: Date): { from: Date; to: Date } {
  return first.getTime() <= second.getTime()
    ? { from: first, to: second }
    : { from: second, to: first };
}

export function getBoundedDayRangeInTimeZone(
  from: Date | undefined,
  to: Date | undefined,
  min: Date,
  max: Date,
  timeZone: string
): { from: Date | undefined; to: Date | undefined } {
  const dayStart = from ? getDayBoundsInTimeZone(from, timeZone).start : undefined;
  const dayEnd = to ? getDayBoundsInTimeZone(to, timeZone).end : undefined;

  return {
    from: dayStart && dayStart < min ? min : dayStart && dayStart > max ? max : dayStart,
    to: dayEnd && dayEnd > max ? max : dayEnd && dayEnd < min ? min : dayEnd
  };
}

export function getBoundedRangeStart(
  start: Date,
  end: Date,
  min: Date,
  timeZone: string
): Date | null {
  if (start >= min) {
    return start;
  }

  const earliestDayStart = getDayBoundsInTimeZone(min, timeZone).start;
  return start >= earliestDayStart && end >= min ? min : null;
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
