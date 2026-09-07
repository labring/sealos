import { describe, expect, it } from 'vitest';

import { getLogFieldLabel } from '@/utils/logFieldLabel';

describe('getLogFieldLabel', () => {
  it('removes the leading underscore from built-in log fields', () => {
    expect(getLogFieldLabel('_time')).toBe('time');
    expect(getLogFieldLabel('_msg')).toBe('msg');
  });

  it('keeps ordinary fields unchanged', () => {
    expect(getLogFieldLabel('container')).toBe('container');
    expect(getLogFieldLabel('pod')).toBe('pod');
  });

  it('removes only one leading underscore', () => {
    expect(getLogFieldLabel('__custom')).toBe('_custom');
  });
});
