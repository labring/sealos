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

// Mock DNS responses
const responses = {
  // example.org responses
  exampleOrgA: {
    id: 24537,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'example.org', type: 'A' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'example.org',
        type: 'A' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: '23.215.0.132'
      },
      {
        name: 'example.org',
        type: 'A' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: '23.215.0.133'
      }
    ],
    authorities: [],
    additionals: []
  },

  exampleOrgAAAA: {
    id: 39566,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'example.org', type: 'AAAA' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'example.org',
        type: 'AAAA' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: '2600:1406:5e00:6::17ce:bc29'
      },
      {
        name: 'example.org',
        type: 'AAAA' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: '2600:1406:5e00:6::17ce:bc3c'
      }
    ],
    authorities: [],
    additionals: []
  },

  exampleOrgNS: {
    id: 1790,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'example.org', type: 'NS' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'example.org',
        type: 'NS' as const,
        ttl: 86400,
        class: 'IN' as const,
        flush: false,
        data: 'a.iana-servers.net'
      },
      {
        name: 'example.org',
        type: 'NS' as const,
        ttl: 86400,
        class: 'IN' as const,
        flush: false,
        data: 'b.iana-servers.net'
      }
    ],
    authorities: [],
    additionals: [
      {
        name: 'a.iana-servers.net',
        type: 'A' as const,
        ttl: 172800,
        class: 'IN' as const,
        flush: false,
        data: '199.43.135.53'
      },
      {
        name: 'b.iana-servers.net',
        type: 'A' as const,
        ttl: 172800,
        class: 'IN' as const,
        flush: false,
        data: '199.43.133.53'
      }
    ]
  },

  // example.com responses
  exampleComA: {
    id: 12345,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'example.com', type: 'A' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'example.com',
        type: 'A' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: '93.184.216.34'
      }
    ],
    authorities: [],
    additionals: []
  },

  exampleComNS: {
    id: 23456,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'example.com', type: 'NS' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'example.com',
        type: 'NS' as const,
        ttl: 86400,
        class: 'IN' as const,
        flush: false,
        data: 'a.iana-servers.net'
      },
      {
        name: 'example.com',
        type: 'NS' as const,
        ttl: 86400,
        class: 'IN' as const,
        flush: false,
        data: 'b.iana-servers.net'
      }
    ],
    authorities: [],
    additionals: [
      {
        name: 'a.iana-servers.net',
        type: 'A' as const,
        ttl: 172800,
        class: 'IN' as const,
        flush: false,
        data: '199.43.135.53'
      }
    ]
  },

  // www.example.org CNAME response
  wwwExampleOrgCNAME: {
    id: 3705,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'www.example.org', type: 'CNAME' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'www.example.org',
        type: 'CNAME' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: 'www.example.org-v2.edgesuite.net'
      }
    ],
    authorities: [
      {
        name: 'example.org',
        type: 'NS' as const,
        ttl: 86400,
        class: 'IN' as const,
        flush: false,
        data: 'a.iana-servers.net'
      },
      {
        name: 'example.org',
        type: 'NS' as const,
        ttl: 86400,
        class: 'IN' as const,
        flush: false,
        data: 'b.iana-servers.net'
      }
    ],
    additionals: [
      {
        name: 'a.iana-servers.net',
        type: 'A' as const,
        ttl: 172800,
        class: 'IN' as const,
        flush: false,
        data: '199.43.135.53'
      },
      {
        name: 'b.iana-servers.net',
        type: 'A' as const,
        ttl: 172800,
        class: 'IN' as const,
        flush: false,
        data: '199.43.133.53'
      }
    ]
  },

  // org TLD NS response
  orgNS: {
    id: 34567,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'org', type: 'NS' as const, class: 'IN' as const }],
    answers: [],
    authorities: [
      {
        name: 'org',
        type: 'NS' as const,
        ttl: 172800,
        class: 'IN' as const,
        flush: false,
        data: 'a0.org.afilias-nst.info'
      },
      {
        name: 'org',
        type: 'NS' as const,
        ttl: 172800,
        class: 'IN' as const,
        flush: false,
        data: 'a2.org.afilias-nst.info'
      },
      {
        name: 'org',
        type: 'NS' as const,
        ttl: 172800,
        class: 'IN' as const,
        flush: false,
        data: 'b0.org.afilias-nst.org'
      }
    ],
    additionals: [
      {
        name: 'a0.org.afilias-nst.info',
        type: 'A' as const,
        ttl: 172800,
        class: 'IN' as const,
        flush: false,
        data: '199.19.56.1'
      },
      {
        name: 'a0.org.afilias-nst.info',
        type: 'AAAA' as const,
        ttl: 172800,
        class: 'IN' as const,
        flush: false,
        data: '2001:500:e::1'
      },
      {
        name: 'a2.org.afilias-nst.info',
        type: 'A' as const,
        ttl: 172800,
        class: 'IN' as const,
        flush: false,
        data: '199.249.112.1'
      },
      {
        name: 'b0.org.afilias-nst.org',
        type: 'A' as const,
        ttl: 172800,
        class: 'IN' as const,
        flush: false,
        data: '199.19.54.1'
      }
    ]
  },

  // Root NS server response (for .org query)
  rootNS: {
    id: 45678,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'org', type: 'NS' as const, class: 'IN' as const }],
    answers: [],
    authorities: [
      {
        name: '',
        type: 'NS' as const,
        ttl: 518400,
        class: 'IN' as const,
        flush: false,
        data: 'a.root-servers.net'
      }
    ],
    additionals: [
      {
        name: 'a.root-servers.net',
        type: 'A' as const,
        ttl: 518400,
        class: 'IN' as const,
        flush: false,
        data: '198.41.0.4'
      },
      {
        name: 'a.root-servers.net',
        type: 'AAAA' as const,
        ttl: 518400,
        class: 'IN' as const,
        flush: false,
        data: '2001:503:ba3e::2:30'
      }
    ]
  },

  // CNAME loop responses (a.example.org -> b.example.org -> a.example.org)
  cnameLoopA1CNAME: {
    id: 50001,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'a.example.org', type: 'CNAME' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'a.example.org',
        type: 'CNAME' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: 'b.example.org'
      }
    ],
    authorities: [],
    additionals: []
  },

  cnameLoopA1A: {
    id: 50011,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'a.example.org', type: 'A' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'a.example.org',
        type: 'CNAME' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: 'b.example.org'
      }
    ],
    authorities: [],
    additionals: []
  },

  cnameLoopB1CNAME: {
    id: 50002,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'b.example.org', type: 'CNAME' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'b.example.org',
        type: 'CNAME' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: 'a.example.org'
      }
    ],
    authorities: [],
    additionals: []
  },

  cnameLoopB1A: {
    id: 50012,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'b.example.org', type: 'A' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'b.example.org',
        type: 'CNAME' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: 'a.example.org'
      }
    ],
    authorities: [],
    additionals: []
  },

  cnameLoopB1AAAA: {
    id: 50013,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'b.example.org', type: 'AAAA' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'b.example.org',
        type: 'CNAME' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: 'a.example.org'
      }
    ],
    authorities: [],
    additionals: []
  },

  // Deep CNAME chain responses (for MAX_CNAME_STEPS_EXCEEDED testing)
  deepCname1CNAME: {
    id: 50003,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'deep1.example.org', type: 'CNAME' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'deep1.example.org',
        type: 'CNAME' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: 'deep2.example.org'
      }
    ],
    authorities: [],
    additionals: []
  },

  deepCname1A: {
    id: 50021,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'deep1.example.org', type: 'A' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'deep1.example.org',
        type: 'CNAME' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: 'deep2.example.org'
      }
    ],
    authorities: [],
    additionals: []
  },

  deepCname2CNAME: {
    id: 50004,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'deep2.example.org', type: 'CNAME' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'deep2.example.org',
        type: 'CNAME' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: 'deep3.example.org'
      }
    ],
    authorities: [],
    additionals: []
  },

  deepCname2A: {
    id: 50022,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'deep2.example.org', type: 'A' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'deep2.example.org',
        type: 'CNAME' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: 'deep3.example.org'
      }
    ],
    authorities: [],
    additionals: []
  },

  deepCname3CNAME: {
    id: 50005,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'deep3.example.org', type: 'CNAME' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'deep3.example.org',
        type: 'CNAME' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: 'deep4.example.org'
      }
    ],
    authorities: [],
    additionals: []
  },

  deepCname3A: {
    id: 50023,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'deep3.example.org', type: 'A' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'deep3.example.org',
        type: 'CNAME' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: 'deep4.example.org'
      }
    ],
    authorities: [],
    additionals: []
  },

  deepCname4CNAME: {
    id: 50006,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'deep4.example.org', type: 'CNAME' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'deep4.example.org',
        type: 'CNAME' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: 'deep5.example.org'
      }
    ],
    authorities: [],
    additionals: []
  },

  deepCname4A: {
    id: 50024,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'deep4.example.org', type: 'A' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'deep4.example.org',
        type: 'CNAME' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: 'deep5.example.org'
      }
    ],
    authorities: [],
    additionals: []
  },

  deepCname5CNAME: {
    id: 50007,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'deep5.example.org', type: 'CNAME' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'deep5.example.org',
        type: 'CNAME' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: 'deep6.example.org'
      }
    ],
    authorities: [],
    additionals: []
  },

  deepCname5A: {
    id: 50025,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'deep5.example.org', type: 'A' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'deep5.example.org',
        type: 'CNAME' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: 'deep6.example.org'
      }
    ],
    authorities: [],
    additionals: []
  },

  // CNAME mismatch response
  cnameMismatch: {
    id: 50007,
    type: 'response' as const,
    flags: 1024,
    flag_qr: true,
    opcode: 'QUERY' as const,
    flag_aa: true,
    flag_tc: false,
    flag_rd: false,
    flag_ra: false,
    flag_z: false,
    flag_ad: false,
    flag_cd: false,
    rcode: 'NOERROR' as const,
    questions: [{ name: 'mismatch.example.org', type: 'CNAME' as const, class: 'IN' as const }],
    answers: [
      {
        name: 'mismatch.example.org',
        type: 'CNAME' as const,
        ttl: 300,
        class: 'IN' as const,
        flush: false,
        data: 'wrong-target.example.org'
      }
    ],
    authorities: [
      {
        name: 'example.org',
        type: 'NS' as const,
        ttl: 86400,
        class: 'IN' as const,
        flush: false,
        data: 'a.iana-servers.net'
      },
      {
        name: 'example.org',
        type: 'NS' as const,
        ttl: 86400,
        class: 'IN' as const,
        flush: false,
        data: 'b.iana-servers.net'
      }
    ],
    additionals: [
      {
        name: 'a.iana-servers.net',
        type: 'A' as const,
        ttl: 172800,
        class: 'IN' as const,
        flush: false,
        data: '199.43.135.53'
      },
      {
        name: 'b.iana-servers.net',
        type: 'A' as const,
        ttl: 172800,
        class: 'IN' as const,
        flush: false,
        data: '199.43.133.53'
      }
    ]
  }
};

// Main fixture object organized by NS server
export const dnsFixtures: DNSFixtures = {
  queries: {
    // NS server: 199.43.135.53 (a.iana-servers.net)
    '199.43.135.53': {
      [queryKey('example.org', 'A')]: {
        request: { name: 'example.org', type: 'A' },
        response: responses.exampleOrgA as Packet
      },
      [queryKey('example.org', 'AAAA')]: {
        request: { name: 'example.org', type: 'AAAA' },
        response: responses.exampleOrgAAAA as Packet
      },
      [queryKey('example.org', 'NS')]: {
        request: { name: 'example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('example.com', 'A')]: {
        request: { name: 'example.com', type: 'A' },
        response: responses.exampleComA as Packet
      },
      [queryKey('example.com', 'NS')]: {
        request: { name: 'example.com', type: 'NS' },
        response: responses.exampleComNS as Packet
      },
      [queryKey('www.example.org', 'CNAME')]: {
        request: { name: 'www.example.org', type: 'CNAME' },
        response: responses.wwwExampleOrgCNAME as Packet
      },
      [queryKey('www.example.org', 'NS')]: {
        request: { name: 'www.example.org', type: 'NS' },
        // www.example.org NS query returns CNAME record (real DNS behavior)
        // This causes extractNSServers to return empty array, then getAuthoritativeNsFromRoot
        // will fallback to return example.org NSInfo
        response: {
          id: 50012,
          type: 'response' as const,
          flags: 1024,
          flag_qr: true,
          opcode: 'QUERY' as const,
          flag_aa: true,
          flag_tc: false,
          flag_rd: false,
          flag_ra: false,
          flag_z: false,
          flag_ad: false,
          flag_cd: false,
          rcode: 'NOERROR' as const,
          questions: [{ name: 'www.example.org', type: 'NS' as const, class: 'IN' as const }],
          answers: [
            {
              name: 'www.example.org',
              type: 'CNAME' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: 'www.example.org-v2.edgesuite.net'
            }
          ],
          authorities: [],
          additionals: []
        } as Packet
      },
      [queryKey('mismatch.example.org', 'NS')]: {
        request: { name: 'mismatch.example.org', type: 'NS' },
        // mismatch.example.org NS query returns CNAME record
        response: {
          id: 50013,
          type: 'response' as const,
          flags: 1024,
          flag_qr: true,
          opcode: 'QUERY' as const,
          flag_aa: true,
          flag_tc: false,
          flag_rd: false,
          flag_ra: false,
          flag_z: false,
          flag_ad: false,
          flag_cd: false,
          rcode: 'NOERROR' as const,
          questions: [{ name: 'mismatch.example.org', type: 'NS' as const, class: 'IN' as const }],
          answers: [
            {
              name: 'mismatch.example.org',
              type: 'CNAME' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: 'wrong-target.example.org'
            }
          ],
          authorities: [],
          additionals: []
        } as Packet
      },
      [queryKey('a.example.org', 'CNAME')]: {
        request: { name: 'a.example.org', type: 'CNAME' },
        response: responses.cnameLoopA1CNAME as Packet
      },
      [queryKey('a.example.org', 'A')]: {
        request: { name: 'a.example.org', type: 'A' },
        response: responses.cnameLoopA1A as Packet
      },
      [queryKey('a.example.org', 'AAAA')]: {
        request: { name: 'a.example.org', type: 'AAAA' },
        response: responses.cnameLoopA1A as Packet
      },
      [queryKey('b.example.org', 'CNAME')]: {
        request: { name: 'b.example.org', type: 'CNAME' },
        response: responses.cnameLoopB1CNAME as Packet
      },
      [queryKey('b.example.org', 'A')]: {
        request: { name: 'b.example.org', type: 'A' },
        response: responses.cnameLoopB1A as Packet
      },
      [queryKey('b.example.org', 'AAAA')]: {
        request: { name: 'b.example.org', type: 'AAAA' },
        response: responses.cnameLoopB1AAAA as Packet
      },
      [queryKey('deep1.example.org', 'CNAME')]: {
        request: { name: 'deep1.example.org', type: 'CNAME' },
        response: responses.deepCname1CNAME as Packet
      },
      [queryKey('deep1.example.org', 'A')]: {
        request: { name: 'deep1.example.org', type: 'A' },
        response: responses.deepCname1A as Packet
      },
      [queryKey('deep2.example.org', 'CNAME')]: {
        request: { name: 'deep2.example.org', type: 'CNAME' },
        response: responses.deepCname2CNAME as Packet
      },
      [queryKey('deep2.example.org', 'A')]: {
        request: { name: 'deep2.example.org', type: 'A' },
        response: responses.deepCname2A as Packet
      },
      [queryKey('deep3.example.org', 'CNAME')]: {
        request: { name: 'deep3.example.org', type: 'CNAME' },
        response: responses.deepCname3CNAME as Packet
      },
      [queryKey('deep3.example.org', 'A')]: {
        request: { name: 'deep3.example.org', type: 'A' },
        response: responses.deepCname3A as Packet
      },
      [queryKey('deep4.example.org', 'CNAME')]: {
        request: { name: 'deep4.example.org', type: 'CNAME' },
        response: responses.deepCname4CNAME as Packet
      },
      [queryKey('deep4.example.org', 'A')]: {
        request: { name: 'deep4.example.org', type: 'A' },
        response: responses.deepCname4A as Packet
      },
      [queryKey('deep5.example.org', 'CNAME')]: {
        request: { name: 'deep5.example.org', type: 'CNAME' },
        response: responses.deepCname5CNAME as Packet
      },
      [queryKey('deep5.example.org', 'A')]: {
        request: { name: 'deep5.example.org', type: 'A' },
        response: responses.deepCname5A as Packet
      },
      [queryKey('mismatch.example.org', 'CNAME')]: {
        request: { name: 'mismatch.example.org', type: 'CNAME' },
        response: responses.cnameMismatch as Packet
      },
      [queryKey('www.example.org', 'A')]: {
        request: { name: 'www.example.org', type: 'A' },
        response: {
          id: 27862,
          type: 'response' as const,
          flags: 1024,
          flag_qr: true,
          opcode: 'QUERY' as const,
          flag_aa: true,
          flag_tc: false,
          flag_rd: false,
          flag_ra: false,
          flag_z: false,
          flag_ad: false,
          flag_cd: false,
          rcode: 'NOERROR' as const,
          questions: [{ name: 'www.example.org', type: 'A' as const, class: 'IN' as const }],
          answers: [
            {
              name: 'www.example.org',
              type: 'CNAME' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: 'www.example.org-v2.edgesuite.net'
            }
          ],
          authorities: [],
          additionals: []
        } as Packet
      },
      [queryKey('www.example.org', 'AAAA')]: {
        request: { name: 'www.example.org', type: 'AAAA' },
        response: {
          id: 61780,
          type: 'response' as const,
          flags: 1024,
          flag_qr: true,
          opcode: 'QUERY' as const,
          flag_aa: true,
          flag_tc: false,
          flag_rd: false,
          flag_ra: false,
          flag_z: false,
          flag_ad: false,
          flag_cd: false,
          rcode: 'NOERROR' as const,
          questions: [{ name: 'www.example.org', type: 'AAAA' as const, class: 'IN' as const }],
          answers: [
            {
              name: 'www.example.org',
              type: 'CNAME' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: 'www.example.org-v2.edgesuite.net'
            }
          ],
          authorities: [],
          additionals: []
        } as Packet
      },
      [queryKey('mismatch.example.org', 'A')]: {
        request: { name: 'mismatch.example.org', type: 'A' },
        response: {
          id: 50008,
          type: 'response' as const,
          flags: 1024,
          flag_qr: true,
          opcode: 'QUERY' as const,
          flag_aa: true,
          flag_tc: false,
          flag_rd: false,
          flag_ra: false,
          flag_z: false,
          flag_ad: false,
          flag_cd: false,
          rcode: 'NOERROR' as const,
          questions: [{ name: 'mismatch.example.org', type: 'A' as const, class: 'IN' as const }],
          answers: [
            {
              name: 'mismatch.example.org',
              type: 'CNAME' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: 'wrong-target.example.org'
            }
          ],
          authorities: [],
          additionals: []
        } as Packet
      },
      [queryKey('mismatch.example.org', 'AAAA')]: {
        request: { name: 'mismatch.example.org', type: 'AAAA' },
        response: {
          id: 50009,
          type: 'response' as const,
          flags: 1024,
          flag_qr: true,
          opcode: 'QUERY' as const,
          flag_aa: true,
          flag_tc: false,
          flag_rd: false,
          flag_ra: false,
          flag_z: false,
          flag_ad: false,
          flag_cd: false,
          rcode: 'NOERROR' as const,
          questions: [
            { name: 'mismatch.example.org', type: 'AAAA' as const, class: 'IN' as const }
          ],
          answers: [
            {
              name: 'mismatch.example.org',
              type: 'CNAME' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: 'wrong-target.example.org'
            }
          ],
          authorities: [],
          additionals: []
        } as Packet
      }
    },

    // NS server: 199.43.133.53 (b.iana-servers.net)
    '199.43.133.53': {
      [queryKey('example.org', 'A')]: {
        request: { name: 'example.org', type: 'A' },
        response: {
          id: 267,
          type: 'response' as const,
          flags: 1024,
          flag_qr: true,
          opcode: 'QUERY' as const,
          flag_aa: true,
          flag_tc: false,
          flag_rd: false,
          flag_ra: false,
          flag_z: false,
          flag_ad: false,
          flag_cd: false,
          rcode: 'NOERROR' as const,
          questions: [{ name: 'example.org', type: 'A' as const, class: 'IN' as const }],
          answers: [
            {
              name: 'example.org',
              type: 'A' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: '23.215.0.132'
            },
            {
              name: 'example.org',
              type: 'A' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: '23.215.0.133'
            }
          ],
          authorities: [
            {
              name: 'example.org',
              type: 'NS' as const,
              ttl: 86400,
              class: 'IN' as const,
              flush: false,
              data: 'a.iana-servers.net'
            },
            {
              name: 'example.org',
              type: 'NS' as const,
              ttl: 86400,
              class: 'IN' as const,
              flush: false,
              data: 'b.iana-servers.net'
            }
          ],
          additionals: []
        } as Packet
      },
      [queryKey('example.org', 'AAAA')]: {
        request: { name: 'example.org', type: 'AAAA' },
        response: {
          id: 18785,
          type: 'response' as const,
          flags: 1024,
          flag_qr: true,
          opcode: 'QUERY' as const,
          flag_aa: true,
          flag_tc: false,
          flag_rd: false,
          flag_ra: false,
          flag_z: false,
          flag_ad: false,
          flag_cd: false,
          rcode: 'NOERROR' as const,
          questions: [{ name: 'example.org', type: 'AAAA' as const, class: 'IN' as const }],
          answers: [
            {
              name: 'example.org',
              type: 'AAAA' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: '2600:1406:5e00:6::17ce:bc29'
            },
            {
              name: 'example.org',
              type: 'AAAA' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: '2600:1406:5e00:6::17ce:bc3c'
            }
          ],
          authorities: [
            {
              name: 'example.org',
              type: 'NS' as const,
              ttl: 86400,
              class: 'IN' as const,
              flush: false,
              data: 'a.iana-servers.net'
            },
            {
              name: 'example.org',
              type: 'NS' as const,
              ttl: 86400,
              class: 'IN' as const,
              flush: false,
              data: 'b.iana-servers.net'
            }
          ],
          additionals: []
        } as Packet
      },
      [queryKey('example.org', 'NS')]: {
        request: { name: 'example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('www.example.org', 'A')]: {
        request: { name: 'www.example.org', type: 'A' },
        response: {
          id: 27862,
          type: 'response' as const,
          flags: 1024,
          flag_qr: true,
          opcode: 'QUERY' as const,
          flag_aa: true,
          flag_tc: false,
          flag_rd: false,
          flag_ra: false,
          flag_z: false,
          flag_ad: false,
          flag_cd: false,
          rcode: 'NOERROR' as const,
          questions: [{ name: 'www.example.org', type: 'A' as const, class: 'IN' as const }],
          answers: [
            {
              name: 'www.example.org',
              type: 'CNAME' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: 'www.example.org-v2.edgesuite.net'
            }
          ],
          authorities: [],
          additionals: []
        } as Packet
      },
      [queryKey('www.example.org', 'AAAA')]: {
        request: { name: 'www.example.org', type: 'AAAA' },
        response: {
          id: 61780,
          type: 'response' as const,
          flags: 1024,
          flag_qr: true,
          opcode: 'QUERY' as const,
          flag_aa: true,
          flag_tc: false,
          flag_rd: false,
          flag_ra: false,
          flag_z: false,
          flag_ad: false,
          flag_cd: false,
          rcode: 'NOERROR' as const,
          questions: [{ name: 'www.example.org', type: 'AAAA' as const, class: 'IN' as const }],
          answers: [
            {
              name: 'www.example.org',
              type: 'CNAME' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: 'www.example.org-v2.edgesuite.net'
            }
          ],
          authorities: [],
          additionals: []
        } as Packet
      },
      [queryKey('www.example.org', 'NS')]: {
        request: { name: 'www.example.org', type: 'NS' },
        response: {
          id: 9715,
          type: 'response' as const,
          flags: 1024,
          flag_qr: true,
          opcode: 'QUERY' as const,
          flag_aa: true,
          flag_tc: false,
          flag_rd: false,
          flag_ra: false,
          flag_z: false,
          flag_ad: false,
          flag_cd: false,
          rcode: 'NOERROR' as const,
          questions: [{ name: 'www.example.org', type: 'NS' as const, class: 'IN' as const }],
          answers: [
            {
              name: 'www.example.org',
              type: 'CNAME' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: 'www.example.org-v2.edgesuite.net'
            }
          ],
          authorities: [],
          additionals: []
        } as Packet
      },
      [queryKey('www.example.org', 'CNAME')]: {
        request: { name: 'www.example.org', type: 'CNAME' },
        response: {
          id: 53344,
          type: 'response' as const,
          flags: 1024,
          flag_qr: true,
          opcode: 'QUERY' as const,
          flag_aa: true,
          flag_tc: false,
          flag_rd: false,
          flag_ra: false,
          flag_z: false,
          flag_ad: false,
          flag_cd: false,
          rcode: 'NOERROR' as const,
          questions: [{ name: 'www.example.org', type: 'CNAME' as const, class: 'IN' as const }],
          answers: [
            {
              name: 'www.example.org',
              type: 'CNAME' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: 'www.example.org-v2.edgesuite.net'
            }
          ],
          authorities: [
            {
              name: 'example.org',
              type: 'NS' as const,
              ttl: 86400,
              class: 'IN' as const,
              flush: false,
              data: 'a.iana-servers.net'
            },
            {
              name: 'example.org',
              type: 'NS' as const,
              ttl: 86400,
              class: 'IN' as const,
              flush: false,
              data: 'b.iana-servers.net'
            }
          ],
          additionals: []
        } as Packet
      },
      [queryKey('mismatch.example.org', 'CNAME')]: {
        request: { name: 'mismatch.example.org', type: 'CNAME' },
        response: responses.cnameMismatch as Packet
      },
      [queryKey('mismatch.example.org', 'A')]: {
        request: { name: 'mismatch.example.org', type: 'A' },
        response: {
          id: 50008,
          type: 'response' as const,
          flags: 1024,
          flag_qr: true,
          opcode: 'QUERY' as const,
          flag_aa: true,
          flag_tc: false,
          flag_rd: false,
          flag_ra: false,
          flag_z: false,
          flag_ad: false,
          flag_cd: false,
          rcode: 'NOERROR' as const,
          questions: [{ name: 'mismatch.example.org', type: 'A' as const, class: 'IN' as const }],
          answers: [
            {
              name: 'mismatch.example.org',
              type: 'CNAME' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: 'wrong-target.example.org'
            }
          ],
          authorities: [],
          additionals: []
        } as Packet
      },
      [queryKey('mismatch.example.org', 'AAAA')]: {
        request: { name: 'mismatch.example.org', type: 'AAAA' },
        response: {
          id: 50009,
          type: 'response' as const,
          flags: 1024,
          flag_qr: true,
          opcode: 'QUERY' as const,
          flag_aa: true,
          flag_tc: false,
          flag_rd: false,
          flag_ra: false,
          flag_z: false,
          flag_ad: false,
          flag_cd: false,
          rcode: 'NOERROR' as const,
          questions: [
            { name: 'mismatch.example.org', type: 'AAAA' as const, class: 'IN' as const }
          ],
          answers: [
            {
              name: 'mismatch.example.org',
              type: 'CNAME' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: 'wrong-target.example.org'
            }
          ],
          authorities: [],
          additionals: []
        } as Packet
      }
    },

    // NS server: 198.41.0.4 (a.root-servers.net)
    '198.41.0.4': {
      [queryKey('org', 'NS')]: {
        request: { name: 'org', type: 'NS' },
        response: responses.orgNS as Packet
      },
      [queryKey('example.org', 'NS')]: {
        request: { name: 'example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('example.com', 'NS')]: {
        request: { name: 'example.com', type: 'NS' },
        response: responses.exampleComNS as Packet
      },
      [queryKey('www.example.org', 'NS')]: {
        request: { name: 'www.example.org', type: 'NS' },
        // Root server delegates to org TLD, which then delegates to example.org
        // So return example.org NS response
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('mismatch.example.org', 'NS')]: {
        request: { name: 'mismatch.example.org', type: 'NS' },
        // Return example.org NS response
        response: responses.exampleOrgNS as Packet
      }
    },

    // NS server: 199.19.56.1 (a0.org.afilias-nst.info)
    '199.19.56.1': {
      [queryKey('org', 'NS')]: {
        request: { name: 'org', type: 'NS' },
        response: responses.orgNS as Packet
      },
      [queryKey('example.org', 'NS')]: {
        request: { name: 'example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('www.example.org', 'NS')]: {
        request: { name: 'www.example.org', type: 'NS' },
        // Return example.org NS response (www.example.org is a subdomain)
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('mismatch.example.org', 'NS')]: {
        request: { name: 'mismatch.example.org', type: 'NS' },
        // Return example.org NS response
        response: responses.exampleOrgNS as Packet
      }
    },

    // NS server: 199.249.112.1 (a2.org.afilias-nst.info)
    '199.249.112.1': {
      [queryKey('org', 'NS')]: {
        request: { name: 'org', type: 'NS' },
        response: responses.orgNS as Packet
      },
      [queryKey('example.org', 'NS')]: {
        request: { name: 'example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('www.example.org', 'NS')]: {
        request: { name: 'www.example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('mismatch.example.org', 'NS')]: {
        request: { name: 'mismatch.example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      }
    },

    // NS server: 199.19.54.1 (b0.org.afilias-nst.org)
    '199.19.54.1': {
      [queryKey('org', 'NS')]: {
        request: { name: 'org', type: 'NS' },
        response: responses.orgNS as Packet
      },
      [queryKey('example.org', 'NS')]: {
        request: { name: 'example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('www.example.org', 'NS')]: {
        request: { name: 'www.example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('mismatch.example.org', 'NS')]: {
        request: { name: 'mismatch.example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      }
    },

    // Local DNS resolvers (8.8.8.8, 1.1.1.1) - used by getAuthoritativeNsFromLocal
    '8.8.8.8': {
      [queryKey('example.org', 'NS')]: {
        request: { name: 'example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('example.com', 'NS')]: {
        request: { name: 'example.com', type: 'NS' },
        response: responses.exampleComNS as Packet
      },
      [queryKey('www.example.org', 'NS')]: {
        request: { name: 'www.example.org', type: 'NS' },
        // www.example.org NS query returns CNAME record (real DNS behavior)
        // This causes extractNSServers to return empty array, then getAuthoritativeNsFromLocal
        // will fallback to query example.org NS
        response: {
          id: 60865,
          type: 'response' as const,
          flags: 1024,
          flag_qr: true,
          opcode: 'QUERY' as const,
          flag_aa: true,
          flag_tc: false,
          flag_rd: false,
          flag_ra: false,
          flag_z: false,
          flag_ad: false,
          flag_cd: false,
          rcode: 'NOERROR' as const,
          questions: [{ name: 'www.example.org', type: 'NS' as const, class: 'IN' as const }],
          answers: [
            {
              name: 'www.example.org',
              type: 'CNAME' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: 'www.example.org-v2.edgesuite.net'
            }
          ],
          authorities: [],
          additionals: []
        } as Packet
      },
      [queryKey('mismatch.example.org', 'NS')]: {
        request: { name: 'mismatch.example.org', type: 'NS' },
        // mismatch.example.org NS query returns CNAME record (like www.example.org)
        // This causes extractNSServers to return empty array, then getAuthoritativeNsFromLocal
        // will fallback to query example.org NS
        response: {
          id: 50010,
          type: 'response' as const,
          flags: 1024,
          flag_qr: true,
          opcode: 'QUERY' as const,
          flag_aa: true,
          flag_tc: false,
          flag_rd: false,
          flag_ra: false,
          flag_z: false,
          flag_ad: false,
          flag_cd: false,
          rcode: 'NOERROR' as const,
          questions: [{ name: 'mismatch.example.org', type: 'NS' as const, class: 'IN' as const }],
          answers: [
            {
              name: 'mismatch.example.org',
              type: 'CNAME' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: 'wrong-target.example.org'
            }
          ],
          authorities: [],
          additionals: []
        } as Packet
      },
      [queryKey('a.example.org', 'NS')]: {
        request: { name: 'a.example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('b.example.org', 'NS')]: {
        request: { name: 'b.example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('deep1.example.org', 'NS')]: {
        request: { name: 'deep1.example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('deep2.example.org', 'NS')]: {
        request: { name: 'deep2.example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('deep3.example.org', 'NS')]: {
        request: { name: 'deep3.example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('deep4.example.org', 'NS')]: {
        request: { name: 'deep4.example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('deep5.example.org', 'NS')]: {
        request: { name: 'deep5.example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      }
    },

    '1.1.1.1': {
      [queryKey('example.org', 'NS')]: {
        request: { name: 'example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('example.com', 'NS')]: {
        request: { name: 'example.com', type: 'NS' },
        response: responses.exampleComNS as Packet
      },
      [queryKey('www.example.org', 'NS')]: {
        request: { name: 'www.example.org', type: 'NS' },
        // www.example.org NS query returns CNAME record (real DNS behavior)
        // This causes extractNSServers to return empty array, then getAuthoritativeNsFromLocal
        // will fallback to query example.org NS
        response: {
          id: 60865,
          type: 'response' as const,
          flags: 1024,
          flag_qr: true,
          opcode: 'QUERY' as const,
          flag_aa: true,
          flag_tc: false,
          flag_rd: false,
          flag_ra: false,
          flag_z: false,
          flag_ad: false,
          flag_cd: false,
          rcode: 'NOERROR' as const,
          questions: [{ name: 'www.example.org', type: 'NS' as const, class: 'IN' as const }],
          answers: [
            {
              name: 'www.example.org',
              type: 'CNAME' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: 'www.example.org-v2.edgesuite.net'
            }
          ],
          authorities: [],
          additionals: []
        } as Packet
      },
      [queryKey('mismatch.example.org', 'NS')]: {
        request: { name: 'mismatch.example.org', type: 'NS' },
        // mismatch.example.org NS query returns CNAME record (like www.example.org)
        // This causes extractNSServers to return empty array, then getAuthoritativeNsFromLocal
        // will fallback to query example.org NS
        response: {
          id: 50011,
          type: 'response' as const,
          flags: 1024,
          flag_qr: true,
          opcode: 'QUERY' as const,
          flag_aa: true,
          flag_tc: false,
          flag_rd: false,
          flag_ra: false,
          flag_z: false,
          flag_ad: false,
          flag_cd: false,
          rcode: 'NOERROR' as const,
          questions: [{ name: 'mismatch.example.org', type: 'NS' as const, class: 'IN' as const }],
          answers: [
            {
              name: 'mismatch.example.org',
              type: 'CNAME' as const,
              ttl: 300,
              class: 'IN' as const,
              flush: false,
              data: 'wrong-target.example.org'
            }
          ],
          authorities: [],
          additionals: []
        } as Packet
      },
      [queryKey('a.example.org', 'NS')]: {
        request: { name: 'a.example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('b.example.org', 'NS')]: {
        request: { name: 'b.example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('deep1.example.org', 'NS')]: {
        request: { name: 'deep1.example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('deep2.example.org', 'NS')]: {
        request: { name: 'deep2.example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('deep3.example.org', 'NS')]: {
        request: { name: 'deep3.example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('deep4.example.org', 'NS')]: {
        request: { name: 'deep4.example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
      },
      [queryKey('deep5.example.org', 'NS')]: {
        request: { name: 'deep5.example.org', type: 'NS' },
        response: responses.exampleOrgNS as Packet
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
