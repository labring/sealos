import { describe, expect, it } from 'vitest';

import { getLogFieldLabel } from '@/utils/logFields';

describe('getLogFieldLabel', () => {
  it.each([
    ['_time', 'time'],
    ['_msg', 'msg'],
    ['container', 'container'],
    ['custom_field', 'custom_field']
  ])('formats %s as %s', (field, expected) => {
    expect(getLogFieldLabel(field)).toBe(expected);
  });
});
