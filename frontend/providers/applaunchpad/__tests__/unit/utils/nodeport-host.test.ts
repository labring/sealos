import { describe, expect, it } from 'vitest';
import { extractIPv4FromNipDomain, resolveNodePortHost } from '@/utils/nodeport-host';

describe('nodeport host helpers', () => {
  it('extracts the node IP from nip.io cloud domains', () => {
    expect(extractIPv4FromNipDomain('192.168.0.62.nip.io')).toBe('192.168.0.62');
    expect(extractIPv4FromNipDomain('applaunchpad.192.168.0.62.nip.io')).toBe('192.168.0.62');
  });

  it('prefers an explicit nodePortHost over domain inference', () => {
    expect(
      resolveNodePortHost({
        configuredHost: '10.0.0.10',
        cloudDomain: '192.168.0.62.nip.io'
      })
    ).toBe('10.0.0.10');
  });

  it('falls back to the cloud domain when no IP can be inferred', () => {
    expect(resolveNodePortHost({ cloudDomain: 'cloud.example.com' })).toBe('cloud.example.com');
  });
});
