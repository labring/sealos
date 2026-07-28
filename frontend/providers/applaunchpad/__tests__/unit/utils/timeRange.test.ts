import { describe, expect, it } from 'vitest';

import {
  formatShanghaiDateTime,
  getBoundedRangeStart,
  getBoundedShanghaiDayRange,
  getShanghaiDayBounds,
  getUtcTimestamp,
  normalizeTimeInput,
  orderDateRange,
  parseShanghaiDateTime
} from '@/utils/timeRange';

describe('Asia/Shanghai date time helpers', () => {
  it('parses Beijing HH:mm input as the matching UTC instant', () => {
    expect(parseShanghaiDateTime('2026-07-28', '00:00')?.toISOString()).toBe(
      '2026-07-27T16:00:00.000Z'
    );
  });

  it('keeps an exact 10:00 to 12:00 range in Beijing time', () => {
    const start = parseShanghaiDateTime('2026-07-28', '10:00');
    const end = parseShanghaiDateTime('2026-07-28', '12:00');

    expect(start?.toISOString()).toBe('2026-07-28T02:00:00.000Z');
    expect(end?.toISOString()).toBe('2026-07-28T04:00:00.000Z');
  });

  it('formats instants in Beijing time regardless of the browser timezone', () => {
    expect(formatShanghaiDateTime('2026-07-27T12:00:00.000Z')).toBe('2026-07-27 20:00:00');
  });

  it('treats backend timestamps without a timezone suffix as UTC', () => {
    expect(formatShanghaiDateTime('2026-07-27 12:00:00')).toBe('2026-07-27 20:00:00');
    expect(getUtcTimestamp('2026-07-27 12:00:00')).toBe(
      new Date('2026-07-27T12:00:00.000Z').getTime()
    );
  });

  it('normalizes short time input without changing full time input', () => {
    expect(normalizeTimeInput('12:00')).toBe('12:00:00');
    expect(normalizeTimeInput('12:00:30')).toBe('12:00:30');
  });

  it('rejects invalid exact times', () => {
    expect(parseShanghaiDateTime('2026-07-27', '25:00')).toBeNull();
  });

  it('derives calendar day bounds in Asia/Shanghai', () => {
    const bounds = getShanghaiDayBounds(new Date('2026-07-27T17:00:00.000Z'));

    expect(bounds.start.toISOString()).toBe('2026-07-27T16:00:00.000Z');
    expect(bounds.end.toISOString()).toBe('2026-07-28T15:59:59.999Z');
  });

  it('clamps calendar days to the exact seven-day and current-time boundaries', () => {
    const min = new Date('2026-07-21T04:00:00.000Z');
    const max = new Date('2026-07-28T04:00:00.000Z');
    const range = getBoundedShanghaiDayRange(
      new Date('2026-07-20T16:00:00.000Z'),
      new Date('2026-07-27T16:00:00.000Z'),
      min,
      max
    );

    expect(range.from?.toISOString()).toBe(min.toISOString());
    expect(range.to?.toISOString()).toBe(max.toISOString());
  });

  it('keeps the earliest selectable day usable as the seven-day boundary advances', () => {
    const min = new Date('2026-07-21T04:00:00.500Z');
    const start = new Date('2026-07-21T04:00:00.000Z');
    const end = new Date('2026-07-21T05:00:00.000Z');

    expect(getBoundedRangeStart(start, end, min)).toEqual(min);
  });

  it('rejects ranges that are entirely before the seven-day boundary', () => {
    const min = new Date('2026-07-21T04:00:00.000Z');
    const start = new Date('2026-07-21T02:00:00.000Z');
    const end = new Date('2026-07-21T03:00:00.000Z');

    expect(getBoundedRangeStart(start, end, min)).toBeNull();
  });

  it('orders reversed manual range endpoints', () => {
    const later = new Date('2026-07-28T04:00:00.000Z');
    const earlier = new Date('2026-07-28T02:00:00.000Z');

    expect(orderDateRange(later, earlier)).toEqual({ from: earlier, to: later });
  });
});
