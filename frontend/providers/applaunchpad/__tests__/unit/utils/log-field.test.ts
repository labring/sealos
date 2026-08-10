import { describe, expect, it } from 'vitest';
import { getLogFieldLabel } from '@/utils/log-field';

describe('getLogFieldLabel', () => {
  it('removes the leading underscore from system log fields', () => {
    expect(getLogFieldLabel('_time')).toBe('time');
    expect(getLogFieldLabel('_msg')).toBe('msg');
  });

  it('preserves regular and multi-underscore field names', () => {
    expect(getLogFieldLabel('container')).toBe('container');
    expect(getLogFieldLabel('__source')).toBe('_source');
  });
});
