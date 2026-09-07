import { describe, expect, it } from 'vitest';
import { formatResourceQuotaValue } from '@sealos/shared';

describe('formatResourceQuotaValue', () => {
  it('formats the pod quota exposed by the desktop quota API', () => {
    expect(formatResourceQuotaValue(2, 'pod')).toBe('2.00');
  });

  it('does not crash when a newer quota type reaches the UI', () => {
    const unknownType = 'unknown-resource' as Parameters<typeof formatResourceQuotaValue>[1];

    expect(formatResourceQuotaValue(1024, unknownType)).toBe('--');
  });
});
