import { describe, expect, it } from 'vitest';

import {
  formatDateTimeInTimeZone,
  getBrowserTimeZone,
  getBoundedRangeStart,
  getBoundedDayRangeInTimeZone,
  getDayBoundsInTimeZone,
  getUtcTimestamp,
  normalizeTimeInput,
  orderDateRange,
  parseDateTimeInTimeZone
} from '@/utils/timeRange';

describe('time zone date time helpers', () => {
  const shanghaiTimeZone = 'Asia/Shanghai';

  it('uses UTC as the server-rendering fallback', () => {
    expect(getBrowserTimeZone()).toBe('UTC');
  });

  it('parses local HH:mm input in the selected time zone', () => {
    expect(parseDateTimeInTimeZone('2026-07-28', '00:00', shanghaiTimeZone)?.toISOString()).toBe(
      '2026-07-27T16:00:00.000Z'
    );
  });

  it('converts the same wall-clock time differently for each user time zone', () => {
    const start = parseDateTimeInTimeZone('2026-07-28', '10:00', shanghaiTimeZone);
    const end = parseDateTimeInTimeZone('2026-07-28', '10:00', 'America/Los_Angeles');

    expect(start?.toISOString()).toBe('2026-07-28T02:00:00.000Z');
    expect(end?.toISOString()).toBe('2026-07-28T17:00:00.000Z');
  });

  it('formats instants in the selected user time zone', () => {
    expect(formatDateTimeInTimeZone('2026-07-27T12:00:00.000Z', shanghaiTimeZone)).toBe(
      '2026-07-27 20:00:00'
    );
    expect(formatDateTimeInTimeZone('2026-07-27T12:00:00.000Z', 'America/Los_Angeles')).toBe(
      '2026-07-27 05:00:00'
    );
  });

  it('treats backend timestamps without a timezone suffix as UTC', () => {
    expect(formatDateTimeInTimeZone('2026-07-27 12:00:00', shanghaiTimeZone)).toBe(
      '2026-07-27 20:00:00'
    );
    expect(getUtcTimestamp('2026-07-27 12:00:00')).toBe(
      new Date('2026-07-27T12:00:00.000Z').getTime()
    );
  });

  it('normalizes short time input without changing full time input', () => {
    expect(normalizeTimeInput('12:00')).toBe('12:00:00');
    expect(normalizeTimeInput('12:00:30')).toBe('12:00:30');
  });

  it('rejects invalid exact times', () => {
    expect(parseDateTimeInTimeZone('2026-07-27', '25:00', shanghaiTimeZone)).toBeNull();
  });

  it('rejects nonexistent local times during DST spring-forward', () => {
    expect(parseDateTimeInTimeZone('2026-03-08', '02:30', 'America/Los_Angeles')).toBeNull();
  });

  it('derives calendar day bounds in the selected time zone', () => {
    const bounds = getDayBoundsInTimeZone(new Date('2026-07-27T17:00:00.000Z'), shanghaiTimeZone);

    expect(bounds.start.toISOString()).toBe('2026-07-27T16:00:00.000Z');
    expect(bounds.end.toISOString()).toBe('2026-07-28T15:59:59.999Z');
  });

  it('clamps calendar days to the exact seven-day and current-time boundaries', () => {
    const min = new Date('2026-07-21T04:00:00.000Z');
    const max = new Date('2026-07-28T04:00:00.000Z');
    const range = getBoundedDayRangeInTimeZone(
      new Date('2026-07-20T16:00:00.000Z'),
      new Date('2026-07-27T16:00:00.000Z'),
      min,
      max,
      shanghaiTimeZone
    );

    expect(range.from?.toISOString()).toBe(min.toISOString());
    expect(range.to?.toISOString()).toBe(max.toISOString());
  });

  it('keeps the earliest selectable day usable as the seven-day boundary advances', () => {
    const min = new Date('2026-07-21T04:00:00.500Z');
    const start = new Date('2026-07-21T04:00:00.000Z');
    const end = new Date('2026-07-21T05:00:00.000Z');

    expect(getBoundedRangeStart(start, end, min, shanghaiTimeZone)).toEqual(min);
  });

  it('rejects ranges that are entirely before the seven-day boundary', () => {
    const min = new Date('2026-07-21T04:00:00.000Z');
    const start = new Date('2026-07-21T02:00:00.000Z');
    const end = new Date('2026-07-21T03:00:00.000Z');

    expect(getBoundedRangeStart(start, end, min, shanghaiTimeZone)).toBeNull();
  });

  it('orders reversed manual range endpoints', () => {
    const later = new Date('2026-07-28T04:00:00.000Z');
    const earlier = new Date('2026-07-28T02:00:00.000Z');

    expect(orderDateRange(later, earlier)).toEqual({ from: earlier, to: later });
  });
});
