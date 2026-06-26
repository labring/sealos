import { describe, expect, it } from 'vitest';
import {
  PortConfigSchema,
  PUBLIC_DOMAIN_PREFIX_MAX_LENGTH,
  publicDomainPrefixSchema
} from '@/types/schema';
import {
  CreatePortConfigSchema as V2CreatePortConfigSchema,
  PortUpdateSchema as V2PortUpdateSchema
} from '@/types/v2alpha/request_schema';

const sixtyThreeCharPrefix = 'a'.repeat(PUBLIC_DOMAIN_PREFIX_MAX_LENGTH);
const sixtyFourCharPrefix = 'a'.repeat(PUBLIC_DOMAIN_PREFIX_MAX_LENGTH + 1);

describe('public domain prefix validation', () => {
  it('allows generated public domain prefixes up to one DNS label', () => {
    expect(publicDomainPrefixSchema.safeParse(sixtyThreeCharPrefix).success).toBe(true);
    expect(
      PortConfigSchema.safeParse({ number: 80, publicDomain: sixtyThreeCharPrefix }).success
    ).toBe(true);
    expect(
      V2CreatePortConfigSchema.safeParse({
        number: 80,
        protocol: 'http',
        publicDomain: sixtyThreeCharPrefix
      }).success
    ).toBe(true);
  });

  it('rejects generated public domain prefixes longer than one DNS label', () => {
    expect(publicDomainPrefixSchema.safeParse(sixtyFourCharPrefix).success).toBe(false);
    expect(
      PortConfigSchema.safeParse({ number: 80, publicDomain: sixtyFourCharPrefix }).success
    ).toBe(false);
    expect(
      V2PortUpdateSchema.safeParse({
        portName: 'web',
        publicDomain: sixtyFourCharPrefix
      }).success
    ).toBe(false);
  });

  it('rejects prefixes that are not valid DNS labels', () => {
    expect(publicDomainPrefixSchema.safeParse('Starts-uppercase').success).toBe(false);
    expect(publicDomainPrefixSchema.safeParse('-starts-with-hyphen').success).toBe(false);
    expect(publicDomainPrefixSchema.safeParse('ends-with-hyphen-').success).toBe(false);
  });
});
