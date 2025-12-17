import type { Packet } from 'dns-packet';

/**
 * DNS Resolver Test Fixtures
 *
 * Organized by NS server -> queries (request + response)
 * This structure makes it easier to mock DNS queries based on the NS server IP.
 */

export interface DNSQuery {
  request: {
    name: string;
    type: string;
  };
  response: Packet;
}

export interface NSServerQueries {
  [queryKey: string]: DNSQuery; // queryKey format: "domain:type"
}

export interface DNSFixtures {
  // NS server IP -> queries
  queries: {
    [nsServerIp: string]: NSServerQueries;
  };
  // NS server hostname -> IP addresses
  nsServerInfo: {
    [nsHostname: string]: {
      ipv4?: string;
      ipv6?: string;
    };
  };
}

// Helper to create a query key
function queryKey(domain: string, type: string): string {
  return `${domain}:${type}`;
}

// Helper function to create DNS response packet
function createDnsResponse(
  id: number,
  questions: Array<{ name: string; type: string; class?: string }>,
  answers: Array<{
    name: string;
    type: string;
    ttl?: number;
    class?: string;
    flush?: boolean;
    data: string;
  }> = [],
  authorities: Array<{
    name: string;
    type: string;
    ttl?: number;
    class?: string;
    flush?: boolean;
    data: string;
  }> = [],
  additionals: Array<{
    name: string;
    type: string;
    ttl?: number;
    class?: string;
    flush?: boolean;
    data: string;
  }> = [],
  rcode: 'NOERROR' | 'NXDOMAIN' | 'SERVFAIL' | 'REFUSED' = 'NOERROR'
): Packet {
  return {
    id,
    type: 'response' as const,
    rcode: rcode,
    questions: questions.map((q) => ({
      name: q.name,
      type: q.type as any,
      class: q.class || ('IN' as const)
    })),
    answers: answers.map((a) => ({
      name: a.name,
      type: a.type as any,
      ttl: a.ttl ?? 300,
      class: a.class || ('IN' as const),
      flush: a.flush ?? false,
      data: a.data
    })),
    authorities: authorities.map((a) => ({
      name: a.name,
      type: a.type as any,
      ttl: a.ttl ?? 300,
      class: a.class || ('IN' as const),
      flush: a.flush ?? false,
      data: a.data
    })),
    additionals: additionals.map((a) => ({
      name: a.name,
      type: a.type as any,
      ttl: a.ttl ?? 300,
      class: a.class || ('IN' as const),
      flush: a.flush ?? false,
      data: a.data
    }))
  } as Packet;
}

// Main fixture object organized by NS server
export const dnsFixtures: DNSFixtures = {
  queries: {
    // NS server: 199.43.135.53 (a.iana-servers.net)
    '199.43.135.53': {
      [queryKey('example.org', 'A')]: {
        request: { name: 'example.org', type: 'A' },
        response: createDnsResponse(
          24537,
          [{ name: 'example.org', type: 'A' }],
          [
            { name: 'example.org', type: 'A', ttl: 300, data: '23.215.0.132' },
            { name: 'example.org', type: 'A', ttl: 300, data: '23.215.0.133' }
          ]
        )
      },
      [queryKey('example.org', 'AAAA')]: {
        request: { name: 'example.org', type: 'AAAA' },
        response: createDnsResponse(
          39566,
          [{ name: 'example.org', type: 'AAAA' }],
          [
            { name: 'example.org', type: 'AAAA', ttl: 300, data: '2600:1406:5e00:6::17ce:bc29' },
            { name: 'example.org', type: 'AAAA', ttl: 300, data: '2600:1406:5e00:6::17ce:bc3c' }
          ]
        )
      },
      [queryKey('example.org', 'NS')]: {
        request: { name: 'example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('example.com', 'A')]: {
        request: { name: 'example.com', type: 'A' },
        response: createDnsResponse(
          12345,
          [{ name: 'example.com', type: 'A' }],
          [{ name: 'example.com', type: 'A', ttl: 300, data: '93.184.216.34' }]
        )
      },
      [queryKey('example.com', 'NS')]: {
        request: { name: 'example.com', type: 'NS' },
        response: createDnsResponse(
          23456,
          [{ name: 'example.com', type: 'NS' }],
          [
            { name: 'example.com', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.com', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [{ name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' }]
        )
      },
      [queryKey('www.example.org', 'CNAME')]: {
        request: { name: 'www.example.org', type: 'CNAME' },
        response: createDnsResponse(
          3705,
          [{ name: 'www.example.org', type: 'CNAME' }],
          [
            {
              name: 'www.example.org',
              type: 'CNAME',
              ttl: 300,
              data: 'www.example.org-v2.edgesuite.net'
            }
          ]
        )
      },
      [queryKey('www.example.org', 'NS')]: {
        request: { name: 'www.example.org', type: 'NS' },
        response: createDnsResponse(
          50012,
          [{ name: 'www.example.org', type: 'NS' }],
          [
            {
              name: 'www.example.org',
              type: 'CNAME',
              ttl: 300,
              data: 'www.example.org-v2.edgesuite.net'
            }
          ]
        )
      },
      [queryKey('mismatch.example.org', 'NS')]: {
        request: { name: 'mismatch.example.org', type: 'NS' },
        response: createDnsResponse(
          50013,
          [{ name: 'mismatch.example.org', type: 'NS' }],
          [
            {
              name: 'mismatch.example.org',
              type: 'CNAME',
              ttl: 300,
              data: 'wrong-target.example.org'
            }
          ]
        )
      },
      [queryKey('a.example.org', 'CNAME')]: {
        request: { name: 'a.example.org', type: 'CNAME' },
        response: createDnsResponse(
          50001,
          [{ name: 'a.example.org', type: 'CNAME' }],
          [{ name: 'a.example.org', type: 'CNAME', ttl: 300, data: 'b.example.org' }]
        )
      },
      [queryKey('a.example.org', 'A')]: {
        request: { name: 'a.example.org', type: 'A' },
        response: createDnsResponse(
          50011,
          [{ name: 'a.example.org', type: 'A' }],
          [{ name: 'a.example.org', type: 'CNAME', ttl: 300, data: 'b.example.org' }]
        )
      },
      [queryKey('a.example.org', 'AAAA')]: {
        request: { name: 'a.example.org', type: 'AAAA' },
        response: createDnsResponse(
          50011,
          [{ name: 'a.example.org', type: 'AAAA' }],
          [{ name: 'a.example.org', type: 'CNAME', ttl: 300, data: 'b.example.org' }]
        )
      },
      [queryKey('b.example.org', 'CNAME')]: {
        request: { name: 'b.example.org', type: 'CNAME' },
        response: createDnsResponse(
          50002,
          [{ name: 'b.example.org', type: 'CNAME' }],
          [{ name: 'b.example.org', type: 'CNAME', ttl: 300, data: 'a.example.org' }]
        )
      },
      [queryKey('b.example.org', 'A')]: {
        request: { name: 'b.example.org', type: 'A' },
        response: createDnsResponse(
          50012,
          [{ name: 'b.example.org', type: 'A' }],
          [{ name: 'b.example.org', type: 'CNAME', ttl: 300, data: 'a.example.org' }]
        )
      },
      [queryKey('b.example.org', 'AAAA')]: {
        request: { name: 'b.example.org', type: 'AAAA' },
        response: createDnsResponse(
          50013,
          [{ name: 'b.example.org', type: 'AAAA' }],
          [{ name: 'b.example.org', type: 'CNAME', ttl: 300, data: 'a.example.org' }]
        )
      },
      [queryKey('deep1.example.org', 'CNAME')]: {
        request: { name: 'deep1.example.org', type: 'CNAME' },
        response: createDnsResponse(
          50003,
          [{ name: 'deep1.example.org', type: 'CNAME' }],
          [{ name: 'deep1.example.org', type: 'CNAME', ttl: 300, data: 'deep2.example.org' }]
        )
      },
      [queryKey('deep1.example.org', 'A')]: {
        request: { name: 'deep1.example.org', type: 'A' },
        response: createDnsResponse(
          50021,
          [{ name: 'deep1.example.org', type: 'A' }],
          [{ name: 'deep1.example.org', type: 'CNAME', ttl: 300, data: 'deep2.example.org' }]
        )
      },
      [queryKey('deep2.example.org', 'CNAME')]: {
        request: { name: 'deep2.example.org', type: 'CNAME' },
        response: createDnsResponse(
          50004,
          [{ name: 'deep2.example.org', type: 'CNAME' }],
          [{ name: 'deep2.example.org', type: 'CNAME', ttl: 300, data: 'deep3.example.org' }]
        )
      },
      [queryKey('deep2.example.org', 'A')]: {
        request: { name: 'deep2.example.org', type: 'A' },
        response: createDnsResponse(
          50022,
          [{ name: 'deep2.example.org', type: 'A' }],
          [{ name: 'deep2.example.org', type: 'CNAME', ttl: 300, data: 'deep3.example.org' }]
        )
      },
      [queryKey('deep3.example.org', 'CNAME')]: {
        request: { name: 'deep3.example.org', type: 'CNAME' },
        response: createDnsResponse(
          50005,
          [{ name: 'deep3.example.org', type: 'CNAME' }],
          [{ name: 'deep3.example.org', type: 'CNAME', ttl: 300, data: 'deep4.example.org' }]
        )
      },
      [queryKey('deep3.example.org', 'A')]: {
        request: { name: 'deep3.example.org', type: 'A' },
        response: createDnsResponse(
          50023,
          [{ name: 'deep3.example.org', type: 'A' }],
          [{ name: 'deep3.example.org', type: 'CNAME', ttl: 300, data: 'deep4.example.org' }]
        )
      },
      [queryKey('deep4.example.org', 'CNAME')]: {
        request: { name: 'deep4.example.org', type: 'CNAME' },
        response: createDnsResponse(
          50006,
          [{ name: 'deep4.example.org', type: 'CNAME' }],
          [{ name: 'deep4.example.org', type: 'CNAME', ttl: 300, data: 'deep5.example.org' }]
        )
      },
      [queryKey('deep4.example.org', 'A')]: {
        request: { name: 'deep4.example.org', type: 'A' },
        response: createDnsResponse(
          50024,
          [{ name: 'deep4.example.org', type: 'A' }],
          [{ name: 'deep4.example.org', type: 'CNAME', ttl: 300, data: 'deep5.example.org' }]
        )
      },
      [queryKey('deep5.example.org', 'CNAME')]: {
        request: { name: 'deep5.example.org', type: 'CNAME' },
        response: createDnsResponse(
          50007,
          [{ name: 'deep5.example.org', type: 'CNAME' }],
          [{ name: 'deep5.example.org', type: 'CNAME', ttl: 300, data: 'deep6.example.org' }]
        )
      },
      [queryKey('deep5.example.org', 'A')]: {
        request: { name: 'deep5.example.org', type: 'A' },
        response: createDnsResponse(
          50025,
          [{ name: 'deep5.example.org', type: 'A' }],
          [{ name: 'deep5.example.org', type: 'CNAME', ttl: 300, data: 'deep6.example.org' }]
        )
      },
      [queryKey('mismatch.example.org', 'CNAME')]: {
        request: { name: 'mismatch.example.org', type: 'CNAME' },
        response: createDnsResponse(
          50007,
          [{ name: 'mismatch.example.org', type: 'CNAME' }],
          [
            {
              name: 'mismatch.example.org',
              type: 'CNAME',
              ttl: 300,
              data: 'wrong-target.example.org'
            }
          ],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('www.example.org', 'A')]: {
        request: { name: 'www.example.org', type: 'A' },
        response: createDnsResponse(
          27862,
          [{ name: 'www.example.org', type: 'A' }],
          [
            {
              name: 'www.example.org',
              type: 'CNAME',
              ttl: 300,
              data: 'www.example.org-v2.edgesuite.net'
            }
          ]
        )
      },
      [queryKey('www.example.org', 'AAAA')]: {
        request: { name: 'www.example.org', type: 'AAAA' },
        response: createDnsResponse(
          61780,
          [{ name: 'www.example.org', type: 'AAAA' }],
          [
            {
              name: 'www.example.org',
              type: 'CNAME',
              ttl: 300,
              data: 'www.example.org-v2.edgesuite.net'
            }
          ]
        )
      },
      [queryKey('mismatch.example.org', 'A')]: {
        request: { name: 'mismatch.example.org', type: 'A' },
        response: createDnsResponse(
          50008,
          [{ name: 'mismatch.example.org', type: 'A' }],
          [
            {
              name: 'mismatch.example.org',
              type: 'CNAME',
              ttl: 300,
              data: 'wrong-target.example.org'
            }
          ]
        )
      },
      [queryKey('mismatch.example.org', 'AAAA')]: {
        request: { name: 'mismatch.example.org', type: 'AAAA' },
        response: createDnsResponse(
          50009,
          [{ name: 'mismatch.example.org', type: 'AAAA' }],
          [
            {
              name: 'mismatch.example.org',
              type: 'CNAME',
              ttl: 300,
              data: 'wrong-target.example.org'
            }
          ]
        )
      },
      // For resolveWithNs multi-nameserver test: bad nameserver (returns SERVFAIL)
      [queryKey('test.example.org', 'A')]: {
        request: { name: 'test.example.org', type: 'A' },
        response: createDnsResponse(
          60001,
          [{ name: 'test.example.org', type: 'A' }],
          [],
          [],
          [],
          'SERVFAIL'
        )
      }
    },

    // NS server: 199.43.133.53 (b.iana-servers.net)
    '199.43.133.53': {
      [queryKey('example.org', 'A')]: {
        request: { name: 'example.org', type: 'A' },
        response: createDnsResponse(
          267,
          [{ name: 'example.org', type: 'A' }],
          [
            { name: 'example.org', type: 'A', ttl: 300, data: '23.215.0.132' },
            { name: 'example.org', type: 'A', ttl: 300, data: '23.215.0.133' }
          ]
        )
      },
      [queryKey('example.org', 'AAAA')]: {
        request: { name: 'example.org', type: 'AAAA' },
        response: createDnsResponse(
          18785,
          [{ name: 'example.org', type: 'AAAA' }],
          [
            { name: 'example.org', type: 'AAAA', ttl: 300, data: '2600:1406:5e00:6::17ce:bc29' },
            { name: 'example.org', type: 'AAAA', ttl: 300, data: '2600:1406:5e00:6::17ce:bc3c' }
          ]
        )
      },
      [queryKey('example.org', 'NS')]: {
        request: { name: 'example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('www.example.org', 'A')]: {
        request: { name: 'www.example.org', type: 'A' },
        response: createDnsResponse(
          27862,
          [{ name: 'www.example.org', type: 'A' }],
          [
            {
              name: 'www.example.org',
              type: 'CNAME',
              ttl: 300,
              data: 'www.example.org-v2.edgesuite.net'
            }
          ]
        )
      },
      [queryKey('www.example.org', 'AAAA')]: {
        request: { name: 'www.example.org', type: 'AAAA' },
        response: createDnsResponse(
          61780,
          [{ name: 'www.example.org', type: 'AAAA' }],
          [
            {
              name: 'www.example.org',
              type: 'CNAME',
              ttl: 300,
              data: 'www.example.org-v2.edgesuite.net'
            }
          ]
        )
      },
      [queryKey('www.example.org', 'NS')]: {
        request: { name: 'www.example.org', type: 'NS' },
        response: createDnsResponse(
          9715,
          [{ name: 'www.example.org', type: 'NS' }],
          [
            {
              name: 'www.example.org',
              type: 'CNAME',
              ttl: 300,
              data: 'www.example.org-v2.edgesuite.net'
            }
          ]
        )
      },
      [queryKey('www.example.org', 'CNAME')]: {
        request: { name: 'www.example.org', type: 'CNAME' },
        response: createDnsResponse(
          53344,
          [{ name: 'www.example.org', type: 'CNAME' }],
          [
            {
              name: 'www.example.org',
              type: 'CNAME',
              ttl: 300,
              data: 'www.example.org-v2.edgesuite.net'
            }
          ]
        )
      },
      [queryKey('mismatch.example.org', 'CNAME')]: {
        request: { name: 'mismatch.example.org', type: 'CNAME' },
        response: createDnsResponse(
          50007,
          [{ name: 'mismatch.example.org', type: 'CNAME' }],
          [
            {
              name: 'mismatch.example.org',
              type: 'CNAME',
              ttl: 300,
              data: 'wrong-target.example.org'
            }
          ]
        )
      },
      [queryKey('mismatch.example.org', 'A')]: {
        request: { name: 'mismatch.example.org', type: 'A' },
        response: createDnsResponse(
          50008,
          [{ name: 'mismatch.example.org', type: 'A' }],
          [
            {
              name: 'mismatch.example.org',
              type: 'CNAME',
              ttl: 300,
              data: 'wrong-target.example.org'
            }
          ]
        )
      },
      [queryKey('mismatch.example.org', 'AAAA')]: {
        request: { name: 'mismatch.example.org', type: 'AAAA' },
        response: createDnsResponse(
          50009,
          [{ name: 'mismatch.example.org', type: 'AAAA' }],
          [
            {
              name: 'mismatch.example.org',
              type: 'CNAME',
              ttl: 300,
              data: 'wrong-target.example.org'
            }
          ]
        )
      },
      // For resolveWithNs multi-nameserver test: bad nameserver (returns SERVFAIL)
      [queryKey('test.example.org', 'A')]: {
        request: { name: 'test.example.org', type: 'A' },
        response: createDnsResponse(
          60002,
          [{ name: 'test.example.org', type: 'A' }],
          [],
          [],
          [],
          'SERVFAIL'
        )
      }
    },

    // NS server: 198.41.0.4 (a.root-servers.net)
    '198.41.0.4': {
      [queryKey('org', 'NS')]: {
        request: { name: 'org', type: 'NS' },
        response: createDnsResponse(
          34567,
          [{ name: 'org', type: 'NS' }],
          [],
          [
            { name: 'org', type: 'NS', ttl: 172800, data: 'a0.org.afilias-nst.info' },
            { name: 'org', type: 'NS', ttl: 172800, data: 'a2.org.afilias-nst.info' },
            { name: 'org', type: 'NS', ttl: 172800, data: 'b0.org.afilias-nst.org' }
          ],
          [
            { name: 'a0.org.afilias-nst.info', type: 'A', ttl: 172800, data: '199.19.56.1' },
            { name: 'a0.org.afilias-nst.info', type: 'AAAA', ttl: 172800, data: '2001:500:e::1' },
            { name: 'a2.org.afilias-nst.info', type: 'A', ttl: 172800, data: '199.249.112.1' },
            { name: 'b0.org.afilias-nst.org', type: 'A', ttl: 172800, data: '199.19.54.1' }
          ]
        )
      },
      [queryKey('example.org', 'NS')]: {
        request: { name: 'example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('example.com', 'NS')]: {
        request: { name: 'example.com', type: 'NS' },
        response: createDnsResponse(
          23456,
          [{ name: 'example.com', type: 'NS' }],
          [
            { name: 'example.com', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.com', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [{ name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' }]
        )
      },
      [queryKey('www.example.org', 'NS')]: {
        request: { name: 'www.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'www.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('mismatch.example.org', 'NS')]: {
        request: { name: 'mismatch.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'mismatch.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      }
    },

    // NS server: 199.19.56.1 (a0.org.afilias-nst.info)
    '199.19.56.1': {
      [queryKey('org', 'NS')]: {
        request: { name: 'org', type: 'NS' },
        response: createDnsResponse(
          34567,
          [{ name: 'org', type: 'NS' }],
          [],
          [
            { name: 'org', type: 'NS', ttl: 172800, data: 'a0.org.afilias-nst.info' },
            { name: 'org', type: 'NS', ttl: 172800, data: 'a2.org.afilias-nst.info' },
            { name: 'org', type: 'NS', ttl: 172800, data: 'b0.org.afilias-nst.org' }
          ],
          [
            { name: 'a0.org.afilias-nst.info', type: 'A', ttl: 172800, data: '199.19.56.1' },
            { name: 'a0.org.afilias-nst.info', type: 'AAAA', ttl: 172800, data: '2001:500:e::1' },
            { name: 'a2.org.afilias-nst.info', type: 'A', ttl: 172800, data: '199.249.112.1' },
            { name: 'b0.org.afilias-nst.org', type: 'A', ttl: 172800, data: '199.19.54.1' }
          ]
        )
      },
      [queryKey('example.org', 'NS')]: {
        request: { name: 'example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('www.example.org', 'NS')]: {
        request: { name: 'www.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'www.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('mismatch.example.org', 'NS')]: {
        request: { name: 'mismatch.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'mismatch.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      }
    },

    // NS server: 199.249.112.1 (a2.org.afilias-nst.info)
    '199.249.112.1': {
      [queryKey('org', 'NS')]: {
        request: { name: 'org', type: 'NS' },
        response: createDnsResponse(
          34567,
          [{ name: 'org', type: 'NS' }],
          [],
          [
            { name: 'org', type: 'NS', ttl: 172800, data: 'a0.org.afilias-nst.info' },
            { name: 'org', type: 'NS', ttl: 172800, data: 'a2.org.afilias-nst.info' },
            { name: 'org', type: 'NS', ttl: 172800, data: 'b0.org.afilias-nst.org' }
          ],
          [
            { name: 'a0.org.afilias-nst.info', type: 'A', ttl: 172800, data: '199.19.56.1' },
            { name: 'a2.org.afilias-nst.info', type: 'A', ttl: 172800, data: '199.249.112.1' },
            { name: 'b0.org.afilias-nst.org', type: 'A', ttl: 172800, data: '199.19.54.1' }
          ]
        )
      },
      [queryKey('example.org', 'NS')]: {
        request: { name: 'example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('www.example.org', 'NS')]: {
        request: { name: 'www.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'www.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('mismatch.example.org', 'NS')]: {
        request: { name: 'mismatch.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'mismatch.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      }
    },

    // NS server: 199.19.54.1 (b0.org.afilias-nst.org)
    '199.19.54.1': {
      [queryKey('org', 'NS')]: {
        request: { name: 'org', type: 'NS' },
        response: createDnsResponse(
          34567,
          [{ name: 'org', type: 'NS' }],
          [],
          [
            { name: 'org', type: 'NS', ttl: 172800, data: 'a0.org.afilias-nst.info' },
            { name: 'org', type: 'NS', ttl: 172800, data: 'a2.org.afilias-nst.info' },
            { name: 'org', type: 'NS', ttl: 172800, data: 'b0.org.afilias-nst.org' }
          ],
          [
            { name: 'a0.org.afilias-nst.info', type: 'A', ttl: 172800, data: '199.19.56.1' },
            { name: 'a2.org.afilias-nst.info', type: 'A', ttl: 172800, data: '199.249.112.1' },
            { name: 'b0.org.afilias-nst.org', type: 'A', ttl: 172800, data: '199.19.54.1' }
          ]
        )
      },
      [queryKey('example.org', 'NS')]: {
        request: { name: 'example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('www.example.org', 'NS')]: {
        request: { name: 'www.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'www.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('mismatch.example.org', 'NS')]: {
        request: { name: 'mismatch.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'mismatch.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      }
    },

    // Local DNS resolvers (8.8.8.8, 1.1.1.1) - used by getAuthoritativeNsFromLocal
    '8.8.8.8': {
      [queryKey('example.org', 'NS')]: {
        request: { name: 'example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('example.com', 'NS')]: {
        request: { name: 'example.com', type: 'NS' },
        response: createDnsResponse(
          23456,
          [{ name: 'example.com', type: 'NS' }],
          [
            { name: 'example.com', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.com', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [{ name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' }]
        )
      },
      [queryKey('www.example.org', 'NS')]: {
        request: { name: 'www.example.org', type: 'NS' },
        response: createDnsResponse(
          60865,
          [{ name: 'www.example.org', type: 'NS' }],
          [
            {
              name: 'www.example.org',
              type: 'CNAME',
              ttl: 300,
              data: 'www.example.org-v2.edgesuite.net'
            }
          ]
        )
      },
      [queryKey('mismatch.example.org', 'NS')]: {
        request: { name: 'mismatch.example.org', type: 'NS' },
        response: createDnsResponse(
          50010,
          [{ name: 'mismatch.example.org', type: 'NS' }],
          [
            {
              name: 'mismatch.example.org',
              type: 'CNAME',
              ttl: 300,
              data: 'wrong-target.example.org'
            }
          ]
        )
      },
      [queryKey('a.example.org', 'NS')]: {
        request: { name: 'a.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'a.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('b.example.org', 'NS')]: {
        request: { name: 'b.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'b.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('deep1.example.org', 'NS')]: {
        request: { name: 'deep1.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'deep1.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('deep2.example.org', 'NS')]: {
        request: { name: 'deep2.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'deep2.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('deep3.example.org', 'NS')]: {
        request: { name: 'deep3.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'deep3.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('deep4.example.org', 'NS')]: {
        request: { name: 'deep4.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'deep4.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('deep5.example.org', 'NS')]: {
        request: { name: 'deep5.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'deep5.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      }
    },

    '1.1.1.1': {
      [queryKey('example.org', 'NS')]: {
        request: { name: 'example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('example.com', 'NS')]: {
        request: { name: 'example.com', type: 'NS' },
        response: createDnsResponse(
          23456,
          [{ name: 'example.com', type: 'NS' }],
          [
            { name: 'example.com', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.com', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [{ name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' }]
        )
      },
      [queryKey('www.example.org', 'NS')]: {
        request: { name: 'www.example.org', type: 'NS' },
        response: createDnsResponse(
          60865,
          [{ name: 'www.example.org', type: 'NS' }],
          [
            {
              name: 'www.example.org',
              type: 'CNAME',
              ttl: 300,
              data: 'www.example.org-v2.edgesuite.net'
            }
          ]
        )
      },
      [queryKey('mismatch.example.org', 'NS')]: {
        request: { name: 'mismatch.example.org', type: 'NS' },
        response: createDnsResponse(
          50011,
          [{ name: 'mismatch.example.org', type: 'NS' }],
          [
            {
              name: 'mismatch.example.org',
              type: 'CNAME',
              ttl: 300,
              data: 'wrong-target.example.org'
            }
          ]
        )
      },
      [queryKey('a.example.org', 'NS')]: {
        request: { name: 'a.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'a.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('b.example.org', 'NS')]: {
        request: { name: 'b.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'b.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('deep1.example.org', 'NS')]: {
        request: { name: 'deep1.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'deep1.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('deep2.example.org', 'NS')]: {
        request: { name: 'deep2.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'deep2.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('deep3.example.org', 'NS')]: {
        request: { name: 'deep3.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'deep3.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('deep4.example.org', 'NS')]: {
        request: { name: 'deep4.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'deep4.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      },
      [queryKey('deep5.example.org', 'NS')]: {
        request: { name: 'deep5.example.org', type: 'NS' },
        response: createDnsResponse(
          1790,
          [{ name: 'deep5.example.org', type: 'NS' }],
          [
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'a.iana-servers.net' },
            { name: 'example.org', type: 'NS', ttl: 86400, data: 'b.iana-servers.net' }
          ],
          [],
          [
            { name: 'a.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.135.53' },
            { name: 'b.iana-servers.net', type: 'A', ttl: 172800, data: '199.43.133.53' }
          ]
        )
      }
    },

    // For resolveWithNs multi-nameserver test: good nameserver (returns success)
    '10.0.0.1': {
      [queryKey('test.example.org', 'A')]: {
        request: { name: 'test.example.org', type: 'A' },
        response: createDnsResponse(
          60003,
          [{ name: 'test.example.org', type: 'A' }],
          [{ name: 'test.example.org', type: 'A', ttl: 300, data: '192.168.1.1' }]
        )
      }
    }
  },

  nsServerInfo: {
    'a.iana-servers.net': {
      ipv4: '199.43.135.53'
    },
    'b.iana-servers.net': {
      ipv4: '199.43.133.53'
    },
    'a.root-servers.net': {
      ipv4: '198.41.0.4',
      ipv6: '2001:503:ba3e::2:30'
    },
    'a0.org.afilias-nst.info': {
      ipv4: '199.19.56.1',
      ipv6: '2001:500:e::1'
    },
    'a2.org.afilias-nst.info': {
      ipv4: '199.249.112.1'
    },
    'b0.org.afilias-nst.org': {
      ipv4: '199.19.54.1'
    },
    // For resolveWithNs multi-nameserver test
    'bad-ns1.example.org': {
      ipv4: '199.43.135.53' // Will return empty response
    },
    'bad-ns2.example.org': {
      ipv4: '199.43.133.53' // Will return empty response
    },
    'good-ns.example.org': {
      ipv4: '10.0.0.1' // Will return success
    }
  }
};

// Helper function to find DNS response by domain, type, and server
export function findDnsResponse(name: string, type: string, server: string): Packet | undefined {
  const serverQueries = dnsFixtures.queries[server];
  if (!serverQueries) {
    return undefined;
  }

  // For NS queries, check if exact match returns CNAME first, and if so, try parent domain
  if (type === 'NS' && name.includes('.')) {
    const exactKey = queryKey(name, type);
    if (serverQueries[exactKey]) {
      const exactResponse = serverQueries[exactKey].response;
      const hasNSRecords =
        exactResponse.answers?.some((a: any) => a.type === 'NS') ||
        exactResponse.authorities?.some((a: any) => a.type === 'NS');
      if (!hasNSRecords) {
        // Exact match returned CNAME (or no NS records), try parent domain
        const parts = name.split('.');
        for (let i = 1; i < parts.length; i++) {
          const parentDomain = parts.slice(i).join('.');
          const parentKey = queryKey(parentDomain, type);
          if (serverQueries[parentKey]) {
            const parentResponse = serverQueries[parentKey].response;
            const parentHasNSRecords =
              parentResponse.answers?.some((a: any) => a.type === 'NS') ||
              parentResponse.authorities?.some((a: any) => a.type === 'NS');
            if (parentHasNSRecords) {
              return parentResponse;
            }
          }
        }
      }
    }
  }

  // Try exact match
  const exactKey = queryKey(name, type);
  if (serverQueries[exactKey]) {
    return serverQueries[exactKey].response;
  }

  // For NS queries, try parent domain if exact match not found
  if (type === 'NS' && name.includes('.')) {
    const parts = name.split('.');
    for (let i = 1; i < parts.length; i++) {
      const parentDomain = parts.slice(i).join('.');
      const parentKey = queryKey(parentDomain, type);
      if (serverQueries[parentKey]) {
        return serverQueries[parentKey].response;
      }
    }
  }

  // Try to find by domain and type (any server) as fallback
  for (const [serverIp, queries] of Object.entries(dnsFixtures.queries)) {
    const key = queryKey(name, type);
    if (queries[key]) {
      return queries[key].response;
    }
  }

  return undefined;
}

// Helper function to find NS server IP addresses
export function findNsServerIp(nsHostname: string): { ipv4?: string; ipv6?: string } {
  return dnsFixtures.nsServerInfo[nsHostname] || {};
}

// Helper function to find A/AAAA records for a domain
export function findDomainRecords(domain: string, type: 'A' | 'AAAA'): string[] {
  for (const queries of Object.values(dnsFixtures.queries)) {
    const key = queryKey(domain, type);
    const query = queries[key];
    if (query?.response?.answers) {
      return query.response.answers.filter((a: any) => a.type === type).map((a: any) => a.data);
    }
  }
  return [];
}

// Helper function to find CNAME record for a domain
export function findCnameRecord(domain: string): string | undefined {
  for (const queries of Object.values(dnsFixtures.queries)) {
    const key = queryKey(domain, 'CNAME');
    const query = queries[key];
    if (query?.response?.answers?.[0]) {
      return (query.response.answers[0] as any).data;
    }
  }
  return undefined;
}
