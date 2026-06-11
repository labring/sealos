import { describe, expect, it } from 'vitest';
import { validatePublicDomainPrefix } from '@/utils/public-domain';

describe('validatePublicDomainPrefix', () => {
  it('normalizes and accepts dns-safe prefixes', () => {
    expect(validatePublicDomainPrefix(' My-App1 ')).toEqual({
      valid: true,
      value: 'my-app1'
    });
  });

  it('rejects reserved prefixes', () => {
    expect(validatePublicDomainPrefix('admin')).toEqual({
      valid: false,
      value: 'admin',
      reason: 'reserved'
    });
  });

  it('rejects invalid dns label shapes', () => {
    expect(validatePublicDomainPrefix('-bad')).toMatchObject({ valid: false, reason: 'format' });
    expect(validatePublicDomainPrefix('bad-')).toMatchObject({ valid: false, reason: 'format' });
    expect(validatePublicDomainPrefix('ab')).toMatchObject({ valid: false, reason: 'format' });
  });
});
