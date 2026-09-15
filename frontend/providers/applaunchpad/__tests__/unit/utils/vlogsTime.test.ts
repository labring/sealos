import { describe, expect, it } from 'vitest';

import { toVlogsQueryTime } from '@/utils/vlogsTime';

describe('toVlogsQueryTime', () => {
  it('serializes a browser timestamp as an unambiguous UTC query time', () => {
    expect(toVlogsQueryTime(1787638417000)).toBe('2026-08-25T06:13:37.000Z');
  });

  it('rejects invalid log query timestamps', () => {
    expect(() => toVlogsQueryTime('not-a-date')).toThrow('Invalid log query timestamp');
  });
});
