import { describe, expect, it } from 'vitest';
import { resolveRequestRegionUid } from '@/service/backend/region';

describe('resolveRequestRegionUid', () => {
  it('prefers an explicitly requested region', () => {
    expect(resolveRequestRegionUid('region-request', 'region-session', 'region-current')).toBe(
      'region-request'
    );
  });

  it('uses the authenticated session region when the request omits one', () => {
    expect(resolveRequestRegionUid(undefined, 'region-session', 'region-current')).toBe(
      'region-session'
    );
  });

  it('falls back to the current cluster region for legacy sessions', () => {
    expect(resolveRequestRegionUid('  ', undefined, 'region-current')).toBe('region-current');
  });
});
