import { describe, expect, it } from 'vitest';

import { formatUtcDateTime, normalizeTimeInput, parseUtcDateTime } from '@/utils/timeRange';

describe('UTC date time helpers', () => {
  it('parses HH:mm input as a UTC instant', () => {
    expect(parseUtcDateTime('2026-07-27', '12:00')?.toISOString()).toBe('2026-07-27T12:00:00.000Z');
  });

  it('keeps an exact 10:00 to 12:00 range in UTC', () => {
    const start = parseUtcDateTime('2026-07-27', '10:00');
    const end = parseUtcDateTime('2026-07-27', '12:00');

    expect(start?.toISOString()).toBe('2026-07-27T10:00:00.000Z');
    expect(end?.toISOString()).toBe('2026-07-27T12:00:00.000Z');
  });

  it('formats instants in UTC regardless of the browser timezone', () => {
    expect(formatUtcDateTime('2026-07-27T12:00:00.000Z')).toBe('2026-07-27 12:00:00');
  });

  it('normalizes short time input without changing full time input', () => {
    expect(normalizeTimeInput('12:00')).toBe('12:00:00');
    expect(normalizeTimeInput('12:00:30')).toBe('12:00:30');
  });

  it('rejects invalid exact times', () => {
    expect(parseUtcDateTime('2026-07-27', '25:00')).toBeNull();
  });
});
