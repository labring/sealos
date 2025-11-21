import type { Packet } from 'dns-packet';

/**
 * DNS Resolver Test Fixtures
 * 
 * This file contains mock DNS response data for testing.
 * It includes responses for various DNS record types and domains.
 */

export interface DNSFixture {
  domain: string;
  dnsQueries: {
    type: string;
    server: string;
    response: Packet;
  }[];
  nsServers: {
    ns: string;
    ipv4?: string;
    ipv6?: string;
  }[];
}

// Mock DNS responses for example.org
const exampleOrgAResponse = {
  id: 24537,
  type: 'response',
  flags: 1024,
  flag_qr: true,
  opcode: 'QUERY',
  flag_aa: true,
  flag_tc: false,
  flag_rd: false,
  flag_ra: false,
  flag_z: false,
  flag_ad: false,
  flag_cd: false,
  rcode: 'NOERROR',
  questions: [{ name: 'example.org', type: 'A', class: 'IN' }],
  answers: [
    {
      name: 'example.org',
      type: 'A',
      ttl: 300,
      class: 'IN',
      flush: false,
      data: '23.215.0.132'
    },
    {
      name: 'example.org',
      type: 'A',
      ttl: 300,
      class: 'IN',
      flush: false,
      data: '23.215.0.133'
    }
  ],
  authorities: [],
  additionals: []
};

const exampleOrgAAAAResponse = {
  id: 39566,
  type: 'response',
  flags: 1024,
  flag_qr: true,
  opcode: 'QUERY',
  flag_aa: true,
  flag_tc: false,
  flag_rd: false,
  flag_ra: false,
  flag_z: false,
  flag_ad: false,
  flag_cd: false,
  rcode: 'NOERROR',
  questions: [{ name: 'example.org', type: 'AAAA', class: 'IN' }],
  answers: [
    {
      name: 'example.org',
      type: 'AAAA',
      ttl: 300,
      class: 'IN',
      flush: false,
      data: '2600:1406:5e00:6::17ce:bc29'
    },
    {
      name: 'example.org',
      type: 'AAAA',
      ttl: 300,
      class: 'IN',
      flush: false,
      data: '2600:1406:5e00:6::17ce:bc3c'
    }
  ],
  authorities: [],
  additionals: []
};

const exampleOrgNSResponse = {
  id: 1790,
  type: 'response',
  flags: 1024,
  flag_qr: true,
  opcode: 'QUERY',
  flag_aa: true,
  flag_tc: false,
  flag_rd: false,
  flag_ra: false,
  flag_z: false,
  flag_ad: false,
  flag_cd: false,
  rcode: 'NOERROR',
  questions: [{ name: 'example.org', type: 'NS', class: 'IN' }],
  answers: [
    {
      name: 'example.org',
      type: 'NS',
      ttl: 86400,
      class: 'IN',
      flush: false,
      data: 'a.iana-servers.net'
    },
    {
      name: 'example.org',
      type: 'NS',
      ttl: 86400,
      class: 'IN',
      flush: false,
      data: 'b.iana-servers.net'
    }
  ],
  authorities: [],
  additionals: [
    {
      name: 'a.iana-servers.net',
      type: 'A',
      ttl: 172800,
      class: 'IN',
      flush: false,
      data: '199.43.135.53'
    },
    {
      name: 'b.iana-servers.net',
      type: 'A',
      ttl: 172800,
      class: 'IN',
      flush: false,
      data: '199.43.133.53'
    }
  ]
};

// Mock DNS responses for example.com
const exampleComAResponse = {
  id: 12345,
  type: 'response',
  flags: 1024,
  flag_qr: true,
  opcode: 'QUERY',
  flag_aa: true,
  flag_tc: false,
  flag_rd: false,
  flag_ra: false,
  flag_z: false,
  flag_ad: false,
  flag_cd: false,
  rcode: 'NOERROR',
  questions: [{ name: 'example.com', type: 'A', class: 'IN' }],
  answers: [
    {
      name: 'example.com',
      type: 'A',
      ttl: 300,
      class: 'IN',
      flush: false,
      data: '93.184.216.34'
    }
  ],
  authorities: [],
  additionals: []
};

const exampleComNSResponse = {
  id: 23456,
  type: 'response',
  flags: 1024,
  flag_qr: true,
  opcode: 'QUERY',
  flag_aa: true,
  flag_tc: false,
  flag_rd: false,
  flag_ra: false,
  flag_z: false,
  flag_ad: false,
  flag_cd: false,
  rcode: 'NOERROR',
  questions: [{ name: 'example.com', type: 'NS', class: 'IN' }],
  answers: [
    {
      name: 'example.com',
      type: 'NS',
      ttl: 86400,
      class: 'IN',
      flush: false,
      data: 'a.iana-servers.net'
    },
    {
      name: 'example.com',
      type: 'NS',
      ttl: 86400,
      class: 'IN',
      flush: false,
      data: 'b.iana-servers.net'
    }
  ],
  authorities: [],
  additionals: [
    {
      name: 'a.iana-servers.net',
      type: 'A',
      ttl: 172800,
      class: 'IN',
      flush: false,
      data: '199.43.135.53'
    }
  ]
};

// Mock DNS responses for www.example.org (CNAME)
const wwwExampleOrgCNAMEResponse = {
  id: 3705,
  type: 'response',
  flags: 1024,
  flag_qr: true,
  opcode: 'QUERY',
  flag_aa: true,
  flag_tc: false,
  flag_rd: false,
  flag_ra: false,
  flag_z: false,
  flag_ad: false,
  flag_cd: false,
  rcode: 'NOERROR',
  questions: [{ name: 'www.example.org', type: 'CNAME', class: 'IN' }],
  answers: [
    {
      name: 'www.example.org',
      type: 'CNAME',
      ttl: 300,
      class: 'IN',
      flush: false,
      data: 'www.example.org-v2.edgesuite.net'
    }
  ],
  authorities: [
    {
      name: 'example.org',
      type: 'NS',
      ttl: 86400,
      class: 'IN',
      flush: false,
      data: 'a.iana-servers.net'
    },
    {
      name: 'example.org',
      type: 'NS',
      ttl: 86400,
      class: 'IN',
      flush: false,
      data: 'b.iana-servers.net'
    }
  ],
  additionals: []
};

// Mock DNS responses for org TLD
const orgNSResponse = {
  id: 34567,
  type: 'response',
  flags: 1024,
  flag_qr: true,
  opcode: 'QUERY',
  flag_aa: true,
  flag_tc: false,
  flag_rd: false,
  flag_ra: false,
  flag_z: false,
  flag_ad: false,
  flag_cd: false,
  rcode: 'NOERROR',
  questions: [{ name: 'org', type: 'NS', class: 'IN' }],
  answers: [],
  authorities: [
    {
      name: 'org',
      type: 'NS',
      ttl: 172800,
      class: 'IN',
      flush: false,
      data: 'a0.org.afilias-nst.info'
    },
    {
      name: 'org',
      type: 'NS',
      ttl: 172800,
      class: 'IN',
      flush: false,
      data: 'a2.org.afilias-nst.info'
    },
    {
      name: 'org',
      type: 'NS',
      ttl: 172800,
      class: 'IN',
      flush: false,
      data: 'b0.org.afilias-nst.org'
    }
  ],
  additionals: [
    {
      name: 'a0.org.afilias-nst.info',
      type: 'A',
      ttl: 172800,
      class: 'IN',
      flush: false,
      data: '199.19.56.1'
    },
    {
      name: 'a0.org.afilias-nst.info',
      type: 'AAAA',
      ttl: 172800,
      class: 'IN',
      flush: false,
      data: '2001:500:e::1'
    },
    {
      name: 'a2.org.afilias-nst.info',
      type: 'A',
      ttl: 172800,
      class: 'IN',
      flush: false,
      data: '199.249.112.1'
    },
    {
      name: 'b0.org.afilias-nst.org',
      type: 'A',
      ttl: 172800,
      class: 'IN',
      flush: false,
      data: '199.19.54.1'
    }
  ]
};

// Root NS server response (for .org query)
const rootNSResponse = {
  id: 45678,
  type: 'response',
  flags: 1024,
  flag_qr: true,
  opcode: 'QUERY',
  flag_aa: true,
  flag_tc: false,
  flag_rd: false,
  flag_ra: false,
  flag_z: false,
  flag_ad: false,
  flag_cd: false,
  rcode: 'NOERROR',
  questions: [{ name: 'org', type: 'NS', class: 'IN' }],
  answers: [],
  authorities: [
    {
      name: '',
      type: 'NS',
      ttl: 518400,
      class: 'IN',
      flush: false,
      data: 'a.root-servers.net'
    }
  ],
  additionals: [
    {
      name: 'a.root-servers.net',
      type: 'A',
      ttl: 518400,
      class: 'IN',
      flush: false,
      data: '198.41.0.4'
    },
    {
      name: 'a.root-servers.net',
      type: 'AAAA',
      ttl: 518400,
      class: 'IN',
      flush: false,
      data: '2001:503:ba3e::2:30'
    }
  ]
};

// Fixture data
export const dnsFixtures: DNSFixture[] = [
  {
    domain: 'example.org',
    dnsQueries: [
      {
        type: 'A',
        server: '199.43.135.53',
        response: exampleOrgAResponse as Packet
      },
      {
        type: 'AAAA',
        server: '199.43.135.53',
        response: exampleOrgAAAAResponse as Packet
      },
      {
        type: 'NS',
        server: '199.43.135.53',
        response: exampleOrgNSResponse as Packet
      }
    ],
    nsServers: [
      { ns: 'a.iana-servers.net', ipv4: '199.43.135.53' },
      { ns: 'b.iana-servers.net', ipv4: '199.43.133.53' }
    ]
  },
  {
    domain: 'example.com',
    dnsQueries: [
      {
        type: 'A',
        server: '199.43.135.53',
        response: exampleComAResponse as Packet
      },
      {
        type: 'NS',
        server: '199.43.135.53',
        response: exampleComNSResponse as Packet
      }
    ],
    nsServers: [
      { ns: 'a.iana-servers.net', ipv4: '199.43.135.53' },
      { ns: 'b.iana-servers.net', ipv4: '199.43.133.53' }
    ]
  },
  {
    domain: 'www.example.org',
    dnsQueries: [
      {
        type: 'CNAME',
        server: '199.43.135.53',
        response: wwwExampleOrgCNAMEResponse as Packet
      }
    ],
    nsServers: [
      { ns: 'a.iana-servers.net', ipv4: '199.43.135.53' },
      { ns: 'b.iana-servers.net', ipv4: '199.43.133.53' }
    ]
  },
  {
    domain: 'org',
    dnsQueries: [
      {
        type: 'NS',
        server: '198.41.0.4',
        response: orgNSResponse as Packet
      }
    ],
    nsServers: [
      { ns: 'a0.org.afilias-nst.info', ipv4: '199.19.56.1', ipv6: '2001:500:e::1' },
      { ns: 'a2.org.afilias-nst.info', ipv4: '199.249.112.1' },
      { ns: 'b0.org.afilias-nst.org', ipv4: '199.19.54.1' }
    ]
  }
];

// Helper function to find DNS response by domain, type, and server
export function findDnsResponse(
  name: string,
  type: string,
  server: string
): Packet | undefined {
  for (const fixture of dnsFixtures) {
    if (fixture.domain === name || name.endsWith(`.${fixture.domain}`)) {
      const query = fixture.dnsQueries.find(
        (q) => q.type === type && (q.server === server || !server)
      );
      if (query) {
        return query.response;
      }
    }
  }

  // Special case: root NS server query
  if (name === 'org' && type === 'NS' && server === '198.41.0.4') {
    return rootNSResponse as Packet;
  }

  return undefined;
}

// Helper function to find NS server IP addresses
export function findNsServerIp(nsHostname: string): { ipv4?: string; ipv6?: string } {
  for (const fixture of dnsFixtures) {
    const nsServer = fixture.nsServers.find((ns) => ns.ns === nsHostname);
    if (nsServer) {
      return {
        ipv4: nsServer.ipv4,
        ipv6: nsServer.ipv6
      };
    }
  }

  // Check root server
  if (nsHostname === 'a.root-servers.net') {
    return {
      ipv4: '198.41.0.4',
      ipv6: '2001:503:ba3e::2:30'
    };
  }

  return {};
}

// Helper function to find A/AAAA records for a domain
export function findDomainRecords(domain: string, type: 'A' | 'AAAA'): string[] {
  for (const fixture of dnsFixtures) {
    if (fixture.domain === domain) {
      const query = fixture.dnsQueries.find((q) => q.type === type);
      if (query?.response?.answers) {
        return query.response.answers
          .filter((a: any) => a.type === type)
          .map((a: any) => a.data);
      }
    }
  }
  return [];
}

// Helper function to find CNAME record for a domain
export function findCnameRecord(domain: string): string | undefined {
  for (const fixture of dnsFixtures) {
    if (fixture.domain === domain) {
      const query = fixture.dnsQueries.find((q) => q.type === 'CNAME');
      if (query?.response?.answers?.[0]) {
        return (query.response.answers[0] as any).data;
      }
    }
  }
  return undefined;
}

