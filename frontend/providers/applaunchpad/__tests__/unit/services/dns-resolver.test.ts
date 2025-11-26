// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  queryDns,
  getAuthoritativeNsFromRoot,
  getAuthoritativeNsFromLocal,
  extractStringAnswer,
  testCname,
  queryA,
  queryAAAA,
  resolveWithNs,
  extractNSServers,
  ResolveError,
  ResolveErrorCode,
  type Nameserver
} from '@/services/dns-resolver';

// Constants for testing (should match the constants in dns-resolver.ts)
const MAX_NAMESERVERS = 3 as const;
import type { StringAnswer } from 'dns-packet';
import {
  dnsFixtures,
  findDnsResponse,
  findNsServerIp,
  findCnameRecord
} from './dns-resolver.fixture';

vi.mock('node:dgram', () => {
  return {
    createSocket: vi.fn((socketType: string) => {
      const handlers: { [key: string]: Function[] } = {};
      const mockSocket: any = {
        send: vi.fn(
          (buffer: Uint8Array, port: number, address: string, callback: (err?: Error) => void) => {
            setTimeout(() => {
              try {
                const dnsPacket = require('dns-packet');
                const query = dnsPacket.decode(Buffer.from(buffer));
                const question = query.questions?.[0];
                if (question) {
                  const response = findDnsResponse(question.name, question.type, address);
                  if (response) {
                    const encoded = dnsPacket.encode(response);
                    if (handlers['message']) {
                      handlers['message'].forEach((handler) => handler(Buffer.from(encoded)));
                    }
                  } else {
                    if (handlers['error']) {
                      handlers['error'].forEach((handler) =>
                        handler(
                          new Error(
                            `No fixture data for ${question.name} ${question.type} from ${address}`
                          )
                        )
                      );
                    }
                  }
                } else {
                  if (handlers['error']) {
                    handlers['error'].forEach((handler) => handler(new Error('Invalid query')));
                  }
                }
              } catch (err) {
                if (handlers['error']) {
                  handlers['error'].forEach((handler) => handler(err));
                }
              }
            }, 10);
            callback();
          }
        ),
        close: vi.fn(),
        on: vi.fn((event: string, handler: Function) => {
          if (!handlers[event]) {
            handlers[event] = [];
          }
          handlers[event].push(handler);
        }),
        removeListener: vi.fn(),
        removeAllListeners: vi.fn()
      };
      return mockSocket;
    })
  };
});

vi.mock('node:dns/promises', async () => {
  return {
    resolve4: vi.fn(async (hostname: string) => {
      const nsIp = findNsServerIp(hostname);
      if (nsIp.ipv4) {
        return [nsIp.ipv4];
      }

      throw new Error(`ENOTFOUND ${hostname}`);
    }),
    resolve6: vi.fn(async (hostname: string) => {
      const nsIp = findNsServerIp(hostname);
      if (nsIp.ipv6) {
        return [nsIp.ipv6];
      }

      throw new Error(`ENOTFOUND ${hostname}`);
    }),
    getServers: vi.fn(() => {
      return ['8.8.8.8', '1.1.1.1'];
    })
  };
});

describe('DNS Resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ResolveErrorCode', () => {
    it('should have all error codes as string literals', () => {
      const codes = Object.values(ResolveErrorCode) as string[];
      codes.forEach((code) => {
        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThan(0);
      });
    });

    it('should have unique error codes', () => {
      const codes = Object.values(ResolveErrorCode);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe('ResolveError', () => {
    describe('constructor', () => {
      it('should create error with required parameters only', () => {
        const error = new ResolveError(ResolveErrorCode.TIMEOUT, 'Test timeout error');

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(ResolveError);
        expect(error.name).toBe('ResolveError');
        expect(error.code).toBe(ResolveErrorCode.TIMEOUT);
        expect(error.message).toBe('Test timeout error');
        expect(error.domain).toBeUndefined();
        expect(error.details).toBeUndefined();
      });

      it('should create error with optional domain and details', () => {
        const details = { rcode: 'SERVFAIL', targetType: 'A' };
        const error = new ResolveError(ResolveErrorCode.DNS_ERROR, 'DNS server error', {
          domain: 'example.com',
          details
        });

        expect(error.code).toBe(ResolveErrorCode.DNS_ERROR);
        expect(error.domain).toBe('example.com');
        expect(error.details).toEqual(details);
      });

      it('should handle undefined and empty options', () => {
        const error1 = new ResolveError(ResolveErrorCode.NO_RECORD, 'No record found', undefined);
        const error2 = new ResolveError(ResolveErrorCode.CNAME_LOOP, 'CNAME loop detected', {});

        expect(error1.domain).toBeUndefined();
        expect(error1.details).toBeUndefined();
        expect(error2.domain).toBeUndefined();
        expect(error2.details).toBeUndefined();
      });
    });

    describe('error properties', () => {
      it('should preserve error message in stack trace', () => {
        const error = new ResolveError(ResolveErrorCode.DNS_ERROR, 'DNS Error');
        expect(error.stack).toContain('DNS Error');
      });
    });
  });

  describe('extractStringAnswer', () => {
    describe('basic functionality', () => {
      it('should extract records of specified types', () => {
        const answers: StringAnswer[] = [
          {
            name: 'example.com',
            type: 'A',
            ttl: 300,
            data: '93.184.216.34'
          },
          {
            name: 'example.com',
            type: 'AAAA',
            ttl: 300,
            data: '2606:2800:220:1:248:1893:25c8:1946'
          },
          {
            name: 'example.com',
            type: 'CNAME',
            ttl: 300,
            data: 'www.example.com'
          }
        ];

        const result = extractStringAnswer(answers, ['A', 'AAAA']);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          name: 'example.com',
          type: 'A',
          ttl: 300,
          data: '93.184.216.34'
        });
        expect(result[1]).toEqual({
          name: 'example.com',
          type: 'AAAA',
          ttl: 300,
          data: '2606:2800:220:1:248:1893:25c8:1946'
        });
      });

      it('should extract single record type', () => {
        const answers: StringAnswer[] = [
          { name: 'example.com', type: 'A', ttl: 300, data: '93.184.216.34' },
          { name: 'example.com', type: 'A', ttl: 600, data: '93.184.216.35' },
          {
            name: 'example.com',
            type: 'AAAA',
            ttl: 300,
            data: '2606:2800:220:1:248:1893:25c8:1946'
          }
        ];

        const result = extractStringAnswer(answers, ['A']);

        expect(result).toHaveLength(2);
        expect(result.every((r) => r.type === 'A')).toBe(true);
      });

      it('should preserve all record properties', () => {
        const answers: StringAnswer[] = [
          {
            name: 'sub.example.com',
            type: 'CNAME',
            ttl: 3600,
            data: 'target.example.com'
          }
        ];

        const result = extractStringAnswer(answers, ['CNAME']);

        expect(result[0].name).toBe('sub.example.com');
        expect(result[0].type).toBe('CNAME');
        expect(result[0].ttl).toBe(3600);
        expect(result[0].data).toBe('target.example.com');
      });
    });

    describe('edge cases', () => {
      it('should return empty array when no matching types', () => {
        const answers: StringAnswer[] = [
          { name: 'example.com', type: 'A', ttl: 300, data: '93.184.216.34' },
          {
            name: 'example.com',
            type: 'AAAA',
            ttl: 300,
            data: '2606:2800:220:1:248:1893:25c8:1946'
          }
        ];

        const result = extractStringAnswer(answers, ['CNAME', 'NS']);

        expect(result).toHaveLength(0);
      });

      it('should return empty array for empty answers', () => {
        const result = extractStringAnswer([], ['A', 'AAAA']);

        expect(result).toHaveLength(0);
        expect(Array.isArray(result)).toBe(true);
      });

      it('should return empty array for empty target types', () => {
        const answers: StringAnswer[] = [
          { name: 'example.com', type: 'A', ttl: 300, data: '93.184.216.34' }
        ];

        const result = extractStringAnswer(answers, []);

        expect(result).toHaveLength(0);
      });

      it('should handle answers with undefined ttl', () => {
        const answers: StringAnswer[] = [
          {
            name: 'example.com',
            type: 'A',
            ttl: undefined,
            data: '93.184.216.34'
          }
        ];

        const result = extractStringAnswer(answers, ['A']);

        expect(result).toHaveLength(1);
        expect(result[0].ttl).toBe(0); // Should default to 0 when ttl is undefined
      });
    });

    describe('various DNS record types', () => {
      it('should extract CNAME records', () => {
        const answers: StringAnswer[] = [
          { name: 'www.example.com', type: 'CNAME', ttl: 300, data: 'example.com' }
        ];

        const result = extractStringAnswer(answers, ['CNAME']);

        expect(result[0].type).toBe('CNAME');
        expect(result[0].data).toBe('example.com');
      });

      it('should extract NS records', () => {
        const answers: StringAnswer[] = [
          { name: 'example.com', type: 'NS', ttl: 86400, data: 'ns1.example.com' }
        ];

        const result = extractStringAnswer(answers, ['NS']);

        expect(result[0].type).toBe('NS');
        expect(result[0].data).toBe('ns1.example.com');
      });
    });

    describe('filtering logic', () => {
      it('should filter by multiple target types', () => {
        const answers: StringAnswer[] = [
          { name: 'example.com', type: 'A', ttl: 300, data: '93.184.216.34' },
          {
            name: 'example.com',
            type: 'AAAA',
            ttl: 300,
            data: '2606:2800:220:1:248:1893:25c8:1946'
          },
          { name: 'example.com', type: 'CNAME', ttl: 300, data: 'www.example.com' },
          { name: 'example.com', type: 'MX' as any, ttl: 3600, data: '10 mail.example.com' }
        ];

        const result = extractStringAnswer(answers, ['A', 'AAAA', 'CNAME']);

        expect(result).toHaveLength(3);
        expect(result.map((r) => r.type).sort()).toEqual(['A', 'AAAA', 'CNAME']);
      });

      it('should maintain order of answers', () => {
        const answers: StringAnswer[] = [
          { name: 'example.com', type: 'A', ttl: 300, data: '93.184.216.34' },
          { name: 'example.com', type: 'A', ttl: 300, data: '93.184.216.35' },
          { name: 'example.com', type: 'A', ttl: 300, data: '93.184.216.36' }
        ];

        const result = extractStringAnswer(answers, ['A']);

        expect(result.map((r) => r.data)).toEqual([
          '93.184.216.34',
          '93.184.216.35',
          '93.184.216.36'
        ]);
      });
    });

    describe('using fixture data', () => {
      it('should extract A records from fixture response', () => {
        const query = dnsFixtures.queries['199.43.135.53']?.['example.org:A'];
        if (query?.response?.answers) {
          const results = extractStringAnswer(query.response.answers as StringAnswer[], ['A']);

          expect(results.length).toBeGreaterThan(0);
          results.forEach((record) => {
            expect(record.type).toBe('A');
            expect(record.data).toMatch(/^\d+\.\d+\.\d+\.\d+$/); // IPv4 format
            expect(record.name).toBe('example.org');
          });
        }
      });

      it('should extract AAAA records from fixture response', () => {
        const query = dnsFixtures.queries['199.43.135.53']?.['example.org:AAAA'];
        if (query?.response?.answers) {
          const results = extractStringAnswer(query.response.answers as StringAnswer[], ['AAAA']);

          expect(results.length).toBeGreaterThan(0);
          results.forEach((record) => {
            expect(record.type).toBe('AAAA');
            expect(record.data).toContain(':'); // IPv6 format
            expect(record.name).toBe('example.org');
          });
        }
      });

      it('should extract NS records from fixture response', () => {
        const query = dnsFixtures.queries['199.43.135.53']?.['example.org:NS'];
        if (query?.response?.answers) {
          const results = extractStringAnswer(query.response.answers as StringAnswer[], ['NS']);

          expect(results.length).toBeGreaterThan(0);
          results.forEach((record) => {
            expect(record.type).toBe('NS');
            expect(record.data).toContain('.');
            expect(record.name).toBe('example.org');
          });
        }
      });

      it('should extract CNAME records from fixture response', () => {
        const query = dnsFixtures.queries['199.43.135.53']?.['www.example.org:CNAME'];
        if (query?.response?.answers) {
          const results = extractStringAnswer(query.response.answers as StringAnswer[], ['CNAME']);

          expect(results.length).toBeGreaterThan(0);
          results.forEach((record) => {
            expect(record.type).toBe('CNAME');
            expect(record.data).toContain('.');
            expect(record.name).toBe('www.example.org');
          });
        }
      });
    });
  });

  describe('extractNSServers', () => {
    it('should return at most MAX_NAMESERVERS nameservers', () => {
      const answers = [
        { name: 'example.org', type: 'NS', ttl: 86400, data: 'ns1.example.org' },
        { name: 'example.org', type: 'NS', ttl: 86400, data: 'ns2.example.org' },
        { name: 'example.org', type: 'NS', ttl: 86400, data: 'ns3.example.org' },
        { name: 'example.org', type: 'NS', ttl: 86400, data: 'ns4.example.org' },
        { name: 'example.org', type: 'NS', ttl: 86400, data: 'ns5.example.org' },
        { name: 'ns1.example.org', type: 'A', ttl: 172800, data: '1.1.1.1' },
        { name: 'ns2.example.org', type: 'A', ttl: 172800, data: '2.2.2.2' },
        { name: 'ns3.example.org', type: 'A', ttl: 172800, data: '3.3.3.3' },
        { name: 'ns4.example.org', type: 'A', ttl: 172800, data: '4.4.4.4' },
        { name: 'ns5.example.org', type: 'A', ttl: 172800, data: '5.5.5.5' }
      ] as any;

      const result = extractNSServers('example.org', answers);

      expect(result.length).toBe(MAX_NAMESERVERS);
      expect(result[0].ns).toBe('ns1.example.org');
      expect(result[1].ns).toBe('ns2.example.org');
      expect(result[2].ns).toBe('ns3.example.org');
    });

    it('should return all nameservers if less than MAX_NAMESERVERS', () => {
      const answers = [
        { name: 'example.org', type: 'NS', ttl: 86400, data: 'ns1.example.org' },
        { name: 'example.org', type: 'NS', ttl: 86400, data: 'ns2.example.org' },
        { name: 'ns1.example.org', type: 'A', ttl: 172800, data: '1.1.1.1' },
        { name: 'ns2.example.org', type: 'A', ttl: 172800, data: '2.2.2.2' }
      ] as any;

      const result = extractNSServers('example.org', answers);

      expect(result.length).toBe(2);
      expect(result[0].ns).toBe('ns1.example.org');
      expect(result[1].ns).toBe('ns2.example.org');
    });

    it('should return exactly MAX_NAMESERVERS when there are exactly MAX_NAMESERVERS nameservers', () => {
      const answers = [
        { name: 'example.org', type: 'NS', ttl: 86400, data: 'ns1.example.org' },
        { name: 'example.org', type: 'NS', ttl: 86400, data: 'ns2.example.org' },
        { name: 'example.org', type: 'NS', ttl: 86400, data: 'ns3.example.org' },
        { name: 'ns1.example.org', type: 'A', ttl: 172800, data: '1.1.1.1' },
        { name: 'ns2.example.org', type: 'A', ttl: 172800, data: '2.2.2.2' },
        { name: 'ns3.example.org', type: 'A', ttl: 172800, data: '3.3.3.3' }
      ] as any;

      const result = extractNSServers('example.org', answers);

      expect(result.length).toBe(MAX_NAMESERVERS);
      expect(result[0].ns).toBe('ns1.example.org');
      expect(result[1].ns).toBe('ns2.example.org');
      expect(result[2].ns).toBe('ns3.example.org');
    });

    it('should filter by target domain name', () => {
      const answers = [
        { name: 'example.org', type: 'NS', ttl: 86400, data: 'ns1.example.org' },
        { name: 'example.com', type: 'NS', ttl: 86400, data: 'ns1.example.com' },
        { name: 'example.org', type: 'NS', ttl: 86400, data: 'ns2.example.org' },
        { name: 'ns1.example.org', type: 'A', ttl: 172800, data: '1.1.1.1' },
        { name: 'ns2.example.org', type: 'A', ttl: 172800, data: '2.2.2.2' }
      ] as any;

      const result = extractNSServers('example.org', answers);

      expect(result.length).toBe(2);
      expect(result[0].ns).toBe('ns1.example.org');
      expect(result[1].ns).toBe('ns2.example.org');
    });
  });

  describe('queryDns', () => {
    it('should query A record using fixture data', async () => {
      const query = dnsFixtures.queries['199.43.135.53']?.['example.org:A'];
      if (query) {
        const response = await queryDns('example.org', 'A', '199.43.135.53');

        expect(response.type).toBe('response');
        expect(response.questions?.[0]?.name).toBe('example.org');
        expect(response.questions?.[0]?.type).toBe('A');
        expect(response.answers).toBeDefined();
        expect(Array.isArray(response.answers)).toBe(true);
        expect(response.answers!.length).toBeGreaterThan(0);
      }
    }, 10000);

    it('should query AAAA record using fixture data', async () => {
      const query = dnsFixtures.queries['199.43.135.53']?.['example.org:AAAA'];
      if (query) {
        const response = await queryDns('example.org', 'AAAA', '199.43.135.53');

        expect(response.type).toBe('response');
        expect(response.questions?.[0]?.name).toBe('example.org');
        expect(response.questions?.[0]?.type).toBe('AAAA');
        expect(response.answers).toBeDefined();
        expect(Array.isArray(response.answers)).toBe(true);
      }
    }, 10000);

    it('should query NS record using fixture data', async () => {
      const query = dnsFixtures.queries['199.43.135.53']?.['example.org:NS'];
      if (query) {
        const response = await queryDns('example.org', 'NS', '199.43.135.53');

        expect(response.type).toBe('response');
        expect(response.questions?.[0]?.name).toBe('example.org');
        expect(response.questions?.[0]?.type).toBe('NS');
        expect(response.answers).toBeDefined();
      }
    }, 10000);

    it('should query CNAME record using fixture data', async () => {
      const query = dnsFixtures.queries['199.43.135.53']?.['www.example.org:CNAME'];
      if (query) {
        const response = await queryDns('www.example.org', 'CNAME', '199.43.135.53');

        expect(response.type).toBe('response');
        expect(response.questions?.[0]?.name).toBe('www.example.org');
        expect(response.questions?.[0]?.type).toBe('CNAME');
        expect(response.answers).toBeDefined();
      }
    }, 10000);
  });

  describe('queryA', () => {
    it('should query A record for example.org', async () => {
      const result = await queryA('example.org');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('A');
      expect(result?.name).toBe('example.org');
      expect(result?.data).toMatch(/^\d+\.\d+\.\d+\.\d+$/); // IPv4 format
    }, 2000);

    it('should query A record for example.com', async () => {
      const result = await queryA('example.com');

      if (result) {
        expect(result.type).toBe('A');
        expect(result.name).toBe('example.com');
        expect(result.data).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      }
    }, 2000);
  });

  describe('queryAAAA', () => {
    it('should query AAAA record for example.org', async () => {
      const result = await queryAAAA('example.org');

      if (result) {
        expect(result.type).toBe('AAAA');
        expect(result.name).toBe('example.org');
        expect(result.data).toContain(':'); // IPv6 format
      }
    }, 2000);
  });

  describe('testCname', () => {
    it('should test CNAME record for www.example.org', async () => {
      const target = findCnameRecord('www.example.org');
      if (target) {
        const result = await testCname('www.example.org', target);

        expect(result).not.toBeNull();
        expect(result?.type).toBe('CNAME');
        expect(result?.name).toBe('www.example.org');
        expect(result?.data).toBe(target);
      }
    }, 2000);

    it('should throw NO_RECORD error for mismatch.example.org (the final error is thrown)', async () => {
      await expect(
        testCname('mismatch.example.org', 'expected-target.example.org')
      ).rejects.toThrow(ResolveError);

      try {
        await testCname('mismatch.example.org', 'expected-target.example.org');
        expect.fail('Should have thrown ResolveError');
      } catch (error) {
        expect(error).toBeInstanceOf(ResolveError);
        if (error instanceof ResolveError) {
          expect(error.code).toBe(ResolveErrorCode.NO_RECORD);
          expect(error.domain).toBe('wrong-target.example.org');
        }
      }
    }, 2000);
  });

  describe('queryDnsFollowCname (via testCname)', () => {
    it('should detect CNAME loop when following CNAME chain', async () => {
      await expect(testCname('a.example.org', 'nonexistent.example.org')).rejects.toThrow(
        ResolveError
      );

      try {
        await testCname('a.example.org', 'nonexistent.example.org');
        expect.fail('Should have thrown ResolveError');
      } catch (error) {
        expect(error).toBeInstanceOf(ResolveError);
        if (error instanceof ResolveError) {
          expect(error.code).toBe(ResolveErrorCode.CNAME_LOOP);
          expect(error.domain).toBe('a.example.org');
          expect((error.details as any)?.visited).toContain('a.example.org');
        }
      }
    }, 2000);

    it('should throw MAX_CNAME_STEPS_EXCEEDED for deep CNAME chain', async () => {
      await expect(testCname('deep1.example.org', 'nonexistent.example.org')).rejects.toThrow(
        ResolveError
      );

      try {
        await testCname('deep1.example.org', 'nonexistent.example.org');
        expect.fail('Should have thrown ResolveError');
      } catch (error) {
        expect(error).toBeInstanceOf(ResolveError);
        if (error instanceof ResolveError) {
          expect(error.code).toBe(ResolveErrorCode.MAX_CNAME_STEPS_EXCEEDED);
          expect((error.details as any)?.step).toBeGreaterThan(4);
        }
      }
    }, 2000);
  });

  describe('queryDnsFollowCname (via queryA)', () => {
    it('should throw CNAME_LOOP error when following CNAME chain creates a loop', async () => {
      await expect(queryA('a.example.org')).rejects.toThrow(ResolveError);

      try {
        await queryA('a.example.org');
        expect.fail('Should have thrown ResolveError');
      } catch (error) {
        expect(error).toBeInstanceOf(ResolveError);
        if (error instanceof ResolveError) {
          expect(error.code).toBe(ResolveErrorCode.CNAME_LOOP);
          expect(error.domain).toBe('a.example.org');
        }
      }
    }, 2000);

    it('should throw MAX_CNAME_STEPS_EXCEEDED for deep CNAME chain in queryA', async () => {
      await expect(queryA('deep1.example.org')).rejects.toThrow(ResolveError);

      try {
        await queryA('deep1.example.org');
        expect.fail('Should have thrown ResolveError');
      } catch (error) {
        expect(error).toBeInstanceOf(ResolveError);
        if (error instanceof ResolveError) {
          expect(error.code).toBe(ResolveErrorCode.MAX_CNAME_STEPS_EXCEEDED);
          expect((error.details as any)?.step).toBeGreaterThan(4);
        }
      }
    }, 2000);
  });

  describe('queryDnsFollowCname (via queryAAAA)', () => {
    it('should throw CNAME_LOOP error when following CNAME chain creates a loop', async () => {
      await expect(queryAAAA('a.example.org')).rejects.toThrow(ResolveError);

      try {
        await queryAAAA('a.example.org');
        expect.fail('Should have thrown ResolveError');
      } catch (error) {
        expect(error).toBeInstanceOf(ResolveError);
        if (error instanceof ResolveError) {
          expect(error.code).toBe(ResolveErrorCode.CNAME_LOOP);
        }
      }
    }, 2000);
  });

  describe('resolveWithNs', () => {
    it('should try multiple nameservers and return result from the last working one', async () => {
      const badNs1: Nameserver = {
        ns: 'bad-ns1.example.org',
        resolveIPv4: async () => '199.43.135.53',
        resolveIPv6: async () => null
      };

      const badNs2: Nameserver = {
        ns: 'bad-ns2.example.org',
        resolveIPv4: async () => '199.43.133.53',
        resolveIPv6: async () => null
      };

      const goodNs: Nameserver = {
        ns: 'good-ns.example.org',
        resolveIPv4: async () => '10.0.0.1',
        resolveIPv6: async () => null
      };

      const nameservers = [badNs1, badNs2, goodNs];

      const result = await resolveWithNs('test.example.org', 'A', nameservers);

      expect(result).not.toBeNull();
      if (!result) {
        throw new Error('Result is null');
      }
      expect(result.type).toBe('response');
      expect(result.questions?.[0]?.name).toBe('test.example.org');
      expect(result.questions?.[0]?.type).toBe('A');
      expect((result as any).rcode).toBe('NOERROR');
      expect(result.answers).toBeDefined();
      expect(Array.isArray(result.answers)).toBe(true);
      expect(result.answers?.length).toBeGreaterThan(0);
      expect((result.answers?.[0] as any)?.data).toBe('192.168.1.1');
      expect(result.ns?.host).toBe('good-ns.example.org');
      expect(result.ns?.ip).toBe('10.0.0.1');
    }, 2000);

    it('should return null if all nameservers fail', async () => {
      const badNs1: Nameserver = {
        ns: 'bad-ns1.example.org',
        resolveIPv4: async () => '199.43.135.53',
        resolveIPv6: async () => null
      };

      const badNs2: Nameserver = {
        ns: 'bad-ns2.example.org',
        resolveIPv4: async () => '199.43.133.53',
        resolveIPv6: async () => null
      };

      const nameservers = [badNs1, badNs2];

      const result = await resolveWithNs('nonexistent.example.org', 'A', nameservers);

      expect(result).toBeNull();
    }, 2000);

    it('should skip nameservers without IP addresses', async () => {
      const noIpNs: Nameserver = {
        ns: 'no-ip-ns.example.org',
        resolveIPv4: async () => null,
        resolveIPv6: async () => null
      };

      const goodNs: Nameserver = {
        ns: 'good-ns.example.org',
        resolveIPv4: async () => '10.0.0.1',
        resolveIPv6: async () => null
      };

      const nameservers = [noIpNs, goodNs];

      const result = await resolveWithNs('test.example.org', 'A', nameservers);

      expect(result).not.toBeNull();
      expect(result?.ns?.host).toBe('good-ns.example.org');
    }, 2000);
  });

  describe('getAuthoritativeNsFromRoot', () => {
    it('should get authoritative NS for example.org from root', async () => {
      const result = await getAuthoritativeNsFromRoot('example.org');

      expect(result).not.toBeNull();
      expect(result?.zone).toBeTruthy();
      expect(result?.nameservers).toBeDefined();
      expect(Array.isArray(result?.nameservers)).toBe(true);
      expect(result?.nameservers.length).toBeGreaterThan(0);

      result?.nameservers.forEach((ns) => {
        expect(ns.ns).toBeTruthy();
        expect(typeof ns.ns).toBe('string');
        expect(typeof ns.resolveIPv4).toBe('function');
        expect(typeof ns.resolveIPv6).toBe('function');
      });

      if (result && result.nameservers.length > 0) {
        const firstNs = result.nameservers[0];
        const ipv4 = await firstNs.resolveIPv4();
        if (ipv4) {
          expect(ipv4).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
        }
      }
    }, 2000);

    it('should get authoritative NS for example.com from root', async () => {
      const result = await getAuthoritativeNsFromRoot('example.com');

      if (result) {
        expect(result.zone).toBeTruthy();
        expect(result.nameservers.length).toBeGreaterThan(0);
      }
    }, 2000);

    it('should get authoritative NS for org TLD from root', async () => {
      const result = await getAuthoritativeNsFromRoot('org');

      if (result) {
        expect(result.zone).toBe('org');
        expect(result.nameservers.length).toBeGreaterThan(0);
      }
    }, 2000);

    it('should throw error for domain that is too long', async () => {
      const longDomain = Array(12).fill('subdomain').join('.') + '.com';

      await expect(getAuthoritativeNsFromRoot(longDomain)).rejects.toThrow(ResolveError);
      try {
        await getAuthoritativeNsFromRoot(longDomain);
        expect.fail('Should have thrown ResolveError');
      } catch (error) {
        expect(error).toBeInstanceOf(ResolveError);
        if (error instanceof ResolveError) {
          expect(error.code).toBe(ResolveErrorCode.DOMAIN_TOO_LONG);
        }
      }
    });
  });

  describe('getAuthoritativeNsFromLocal', () => {
    it('should get authoritative NS for example.org from local resolver', async () => {
      const result = await getAuthoritativeNsFromLocal('example.org');

      if (result) {
        expect(result.zone).toBeTruthy();
        expect(result.nameservers).toBeDefined();
        expect(Array.isArray(result.nameservers)).toBe(true);
        expect(result.nameservers.length).toBeGreaterThan(0);

        result.nameservers.forEach((ns) => {
          expect(ns.ns).toBeTruthy();
          expect(typeof ns.ns).toBe('string');
          expect(typeof ns.resolveIPv4).toBe('function');
          expect(typeof ns.resolveIPv6).toBe('function');
        });
      }
    }, 2000);

    it('should get authoritative NS for example.com from local resolver', async () => {
      const result = await getAuthoritativeNsFromLocal('example.com');

      if (result) {
        expect(result.zone).toBeTruthy();
        expect(result.nameservers.length).toBeGreaterThan(0);
      }
    }, 2000);

    it('should return null for empty domain', async () => {
      const result = await getAuthoritativeNsFromLocal('');

      expect(result).toBeNull();
    });

    it('should throw error for domain that is too long', async () => {
      const longDomain = Array(12).fill('subdomain').join('.') + '.com';

      try {
        await getAuthoritativeNsFromLocal(longDomain);
        expect.fail('Should have thrown ResolveError');
      } catch (error) {
        expect(error).toBeInstanceOf(ResolveError);
        if (error instanceof ResolveError) {
          expect(error.code).toBe(ResolveErrorCode.DOMAIN_TOO_LONG);
        }
      }
    });
  });
});
