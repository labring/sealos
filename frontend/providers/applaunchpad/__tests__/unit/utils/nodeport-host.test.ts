import { describe, expect, it } from 'vitest';
import { extractIPv4FromNipDomain, resolveNodePortHost } from '@/utils/nodeport-host';

describe('nodeport host helpers', () => {
  it('extracts the node IP from nip.io cloud domains', () => {
    expect(extractIPv4FromNipDomain('192.168.0.62.nip.io')).toBe('192.168.0.62');
    expect(extractIPv4FromNipDomain('applaunchpad.192.168.0.62.nip.io')).toBe('192.168.0.62');
  });

  it('normalizes the configured nodePortHost value', () => {
    expect(resolveNodePortHost({ configuredHost: ' 10.0.0.10. ' })).toBe('10.0.0.10');
    expect(resolveNodePortHost({ configuredHost: '' })).toBe('');
  });
});
