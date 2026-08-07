import { describe, expect, it } from 'vitest';
import {
  normalizeCidr,
  normalizeCidrList,
  confirmPublicCidrs,
  normalizeNetworkIsolationConfig,
  validateNetworkIsolationConfig
} from '@/utils/network-isolation';
import {
  MAX_CIDRS_PER_RULE,
  MAX_NETWORK_ISOLATION_RULES,
  type NetworkIsolationConfig
} from '@/types/networkIsolation';

describe('network isolation rules', () => {
  it('normalizes IPv4 and IPv6 addresses before saving', () => {
    expect(normalizeCidr('10.20.0.17/16')).toMatchObject({
      valid: true,
      value: '10.20.0.0/16'
    });
    expect(normalizeCidr('2001:db8:0:1::7/64')).toMatchObject({
      valid: true,
      value: '2001:db8:0:1::/64'
    });
    expect(normalizeCidr('203.0.113.10')).toMatchObject({
      valid: true,
      value: '203.0.113.10/32'
    });
    expect(normalizeCidr('203.0.113.10/')).toMatchObject({ valid: false });
  });

  it('deduplicates and sorts CIDR entries', () => {
    expect(normalizeCidrList(['203.0.113.10', '10.20.0.17/16', '203.0.113.10/32'])).toEqual([
      '10.20.0.0/16',
      '203.0.113.10/32'
    ]);
  });

  it('rejects incomplete, duplicate, and over-limit rules', () => {
    const config: NetworkIsolationConfig = {
      enabled: true,
      rules: [
        {
          id: 'application-empty',
          type: 'application',
          sourceWorkspaceId: '',
          sourceApplicationId: ''
        },
        {
          id: 'application-first',
          type: 'application',
          sourceWorkspaceId: 'workspace-a',
          sourceApplicationId: 'app-a'
        },
        {
          id: 'application-duplicate',
          type: 'application',
          sourceWorkspaceId: 'workspace-a',
          sourceApplicationId: 'app-a'
        },
        {
          id: 'cidr-over-limit',
          type: 'cidr',
          cidrs: Array.from({ length: MAX_CIDRS_PER_RULE + 1 }, (_, index) => `10.0.0.${index}`)
        }
      ]
    };

    const result = validateNetworkIsolationConfig(config);

    expect(result.valid).toBe(false);
    expect(result.applicationRuleErrors).toEqual({
      'application-empty': 'required',
      'application-duplicate': 'duplicate'
    });
    expect(result.cidrRuleErrors).toEqual({ 'cidr-over-limit': 'tooMany' });
  });

  it('enforces the global rule limit and identifies public CIDR confirmation', () => {
    const rules = Array.from({ length: MAX_NETWORK_ISOLATION_RULES + 1 }, (_, index) => ({
      id: `cidr-${index}`,
      type: 'cidr' as const,
      cidrs: [index === 0 ? '0.0.0.0/0' : `192.0.2.${index % 255}`]
    }));

    const result = validateNetworkIsolationConfig({ enabled: true, rules });

    expect(result.exceedsRuleLimit).toBe(true);
    expect(result.requiresPublicConfirmation).toBe(true);
  });

  it('requires explicit confirmation before a public CIDR is marked for persistence', () => {
    const config: NetworkIsolationConfig = {
      enabled: true,
      rules: [{ id: 'public', type: 'cidr', cidrs: ['0.0.0.0/0'] }]
    };

    expect(normalizeNetworkIsolationConfig(config).rules[0]).toMatchObject({
      allowPublic: undefined
    });
    expect(confirmPublicCidrs(config).rules[0]).toMatchObject({ allowPublic: true });
  });

  it('retains valid rules when strict mode is turned off', () => {
    const config: NetworkIsolationConfig = {
      enabled: false,
      rules: [
        {
          id: 'source',
          type: 'application',
          sourceWorkspaceId: 'ns-source',
          sourceApplicationId: 'api'
        }
      ]
    };

    expect(normalizeNetworkIsolationConfig(config)).toEqual(config);
  });
});
