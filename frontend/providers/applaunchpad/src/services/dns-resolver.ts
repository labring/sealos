import * as dns from 'node:dns/promises';
import * as dgram from 'node:dgram';
import * as dnsPacket from 'dns-packet';
import type { Packet, StringAnswer } from 'dns-packet';

export type NSInfo = {
  readonly zone: string;
  readonly nameservers: readonly Nameserver[];
};

export type Nameserver = {
  readonly ns: string;
  /**
   * Resolve IPv4 address. Returns IP if available (from glue records or cached),
   * or resolves lazily via DNS lookup. Returns null if not available.
   */
  readonly resolveIPv4: () => Promise<string | null>;
  /**
   * Resolve IPv6 address. Returns IP if available (from glue records or cached),
   * or resolves lazily via DNS lookup. Returns null if not available.
   */
  readonly resolveIPv6: () => Promise<string | null>;
};

export type DNSRecord = {
  readonly name: string;
  readonly type: string;
  readonly ttl: number;
  readonly data: string;
};

// Constants
const QUERY_TIMEOUT = 5000 as const;
const MAX_QUERY_STEPS = 10 as const;
const MAX_CNAME_STEPS = 4 as const;
const ROOT_NS_SERVER: Nameserver = {
  ns: 'a.root-servers.net',
  resolveIPv4: async () => '198.41.0.4',
  resolveIPv6: async () => '2001:503:ba3e::2:30'
} as const;

/**
 * Check if an IP address is IPv6
 */
const isIPv6 = (ip: string): boolean => {
  return ip.includes(':');
};

/**
 * Check if DNS response code indicates a definitive DNS error (not network error)
 * These are DNS-level errors that should not trigger fallback
 */
const isDefinitiveDNSError = (rcode: string): boolean => {
  return (
    rcode === 'NXDOMAIN' ||
    rcode === 'SERVFAIL' ||
    rcode === 'REFUSED' ||
    rcode === 'NOTIMP' ||
    rcode === 'YXDOMAIN' ||
    rcode === 'YXRRSET' ||
    rcode === 'NXRRSET' ||
    rcode === 'NOTAUTH' ||
    rcode === 'NOTZONE'
  );
};

/**
 * Send DNS queries to server with dual-stack support (IPv4/IPv6).
 */
export const queryDns = async (
  questions: readonly dnsPacket.Question[],
  server: string
): Promise<Packet> => {
  const socketType = isIPv6(server) ? 'udp6' : 'udp4';

  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket(socketType);
    const query = dnsPacket.encode({
      type: 'query',
      id: Math.floor(Math.random() * 65535),
      // No recursive queries
      flags: 0,
      questions: [...questions]
    });

    const timer = setTimeout(() => {
      socket.close();
      reject(new Error(`Timeout querying ${server} for DNS answers.`));
    }, QUERY_TIMEOUT);

    socket.on('message', (msg) => {
      clearTimeout(timer);
      socket.close();
      try {
        const response = dnsPacket.decode(msg);
        resolve(response);
      } catch (err) {
        reject(err);
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      socket.close();
      reject(err);
    });

    socket.send(new Uint8Array(query), 53, server, (err) => {
      if (err) {
        clearTimeout(timer);
        socket.close();
        reject(err);
      }
    });
  });
};

/**
 * Extract NS servers with their possible IP addresses from DNS answers.
 * @returns a list of NS servers with lazy IP resolution.
 */
const extractNSServers = (
  target: string,
  allAnswers: readonly dnsPacket.Answer[]
): readonly Nameserver[] => {
  const nsWithPossibleAddresses = allAnswers.reduce(
    (prev, nsRecord) => {
      if (nsRecord.type !== 'NS' || nsRecord.name !== target) return prev;

      const aRecord = allAnswers.find(
        (addrRecord) => addrRecord.type === 'A' && addrRecord.name === nsRecord.data
      );
      const aaaaRecord = allAnswers.find(
        (addrRecord) => addrRecord.type === 'AAAA' && addrRecord.name === nsRecord.data
      );

      const aData = (aRecord as any)?.data as string | undefined;
      const aaaaData = (aaaaRecord as any)?.data as string | undefined;

      if (!prev.has(nsRecord.data)) {
        const glueData: { glueA?: string; glueAAAA?: string } = {};
        if (aData !== undefined) {
          glueData.glueA = aData;
        }
        if (aaaaData !== undefined) {
          glueData.glueAAAA = aaaaData;
        }
        prev.set(nsRecord.data, glueData);
      }

      return prev;
    },
    new Map<
      string,
      {
        glueA?: string;
        glueAAAA?: string;
      }
    >()
  );

  return Array.from(nsWithPossibleAddresses.entries()).map(([ns, addresses]): Nameserver => {
    const glueA = addresses.glueA;
    const glueAAAA = addresses.glueAAAA;

    return {
      ns,
      // If glue A/AAAA record is available
      // Otherwise, resolve lazily via DNS lookup
      resolveIPv4: async (): Promise<string | null> => {
        if (glueA) {
          return glueA;
        }
        try {
          const ipResult = await dns.resolve4(ns);
          return ipResult[0];
        } catch {
          return null;
        }
      },
      resolveIPv6: async (): Promise<string | null> => {
        if (glueAAAA) {
          return glueAAAA;
        }
        try {
          const ipResult = await dns.resolve6(ns);
          return ipResult[0];
        } catch {
          return null;
        }
      }
    };
  });
};

/**
 * Resolve NS servers and query DNS records with retry logic.
 * Tries each NS server in order until one succeeds.
 * @param questions - DNS questions to query
 * @param nameservers - List of NS servers
 * @returns DNS response packet or null if all servers failed
 */
const resolveWithNs = async (
  questions: readonly dnsPacket.Question[],
  nameservers: readonly Nameserver[]
): Promise<Packet | null> => {
  for (const nsServer of nameservers) {
    try {
      // Try IPv4 first, then IPv6
      let ip: string | null;
      ip = await nsServer.resolveIPv4();
      if (!ip) {
        ip = await nsServer.resolveIPv6();
      }

      if (!ip) {
        // No IP available, try next NS
        continue;
      }

      const dnsResponse = await queryDns(questions, ip);
      if (dnsResponse.type === 'response') {
        const rcode = (dnsResponse as any).rcode;
        if (rcode === 'NOERROR') {
          // Success
          return dnsResponse;
        } else if (isDefinitiveDNSError(rcode)) {
          // DNS-level error
          return null;
        }

        // Other response codes, try next NS
      }
    } catch (err) {
      // Query failed or network error, try next NS
      continue;
    }
  }

  // All NS failed
  return null;
};

/**
 * Get authoritative NS servers of the given domain name.
 * @returns a list of NS servers
 */
export const getAuthoritativeNs = async (domain: string): Promise<NSInfo | null> => {
  const parts = domain
    .split('.')
    .filter((p) => p.length > 0)
    .slice()
    .reverse();

  if (parts.length > MAX_QUERY_STEPS) {
    throw new Error('Domain level exceeds the limit of ' + MAX_QUERY_STEPS);
  }

  const findNSRecursive = async (
    testDomain: string,
    remainingParts: readonly string[],
    lastValidNSInfo: NSInfo | null = null
  ): Promise<NSInfo | null> => {
    // Use NS servers from lastValidNSInfo if available, otherwise use root server
    const nsServersToQuery = lastValidNSInfo ? lastValidNSInfo.nameservers : [ROOT_NS_SERVER];

    const nsResponse = await resolveWithNs(
      [
        {
          name: testDomain,
          type: 'NS'
        }
      ],
      nsServersToQuery
    );

    if (!nsResponse) {
      // Not valid response, return last valid NSInfo if available.
      if (lastValidNSInfo) {
        return lastValidNSInfo;
      }

      // All parts is not valid.
      if (remainingParts.length === 0) {
        return null;
      }

      // Continue trying...
      return findNSRecursive(
        `${remainingParts[0]}.${testDomain}`,
        remainingParts.slice(1),
        lastValidNSInfo
      );
    }

    // Successfully got NS response
    const answers = [
      ...(nsResponse.answers ?? []),
      ...(nsResponse.authorities ?? []),
      ...(nsResponse.additionals ?? [])
    ];

    const nsServersWithIP = extractNSServers(testDomain, answers);
    if (nsServersWithIP.length === 0) {
      // Exhausted input, return last valid NSInfo if available
      if (remainingParts.length === 0) {
        return lastValidNSInfo;
      }

      return findNSRecursive(
        `${remainingParts[0]}.${testDomain}`,
        remainingParts.slice(1),
        lastValidNSInfo
      );
    }

    // Valid response, continue...
    const currentNSInfo: NSInfo = {
      zone: testDomain,
      nameservers: nsServersWithIP
    };

    if (remainingParts.length === 0) {
      return currentNSInfo;
    }

    const subdomainResult = await findNSRecursive(
      `${remainingParts[0]}.${testDomain}`,
      remainingParts.slice(1),
      currentNSInfo
    );

    // Fallback to latest valid response (zone).
    return subdomainResult ?? currentNSInfo;
  };

  const result = await findNSRecursive(`${parts[0]}`, parts.slice(1), null);

  return result;
};

/**
 * Extract data from DNS answers.
 */
export const extractStringAnswer = (
  answers: readonly StringAnswer[],
  targetTypes: readonly dnsPacket.StringRecordType[]
): readonly DNSRecord[] => {
  if (!answers || answers.length === 0) {
    return [];
  }

  const targetTypesSet = new Set(targetTypes);
  const filteredAnswer = answers.filter((answer) => targetTypesSet.has(answer.type));

  return filteredAnswer.map(
    (answer): DNSRecord => ({
      name: answer.name,
      type: answer.type,
      ttl: answer.ttl ?? 0,
      data: answer.data
    })
  );
};

type FollowCnameOptions = {
  readonly visited: ReadonlySet<string>;
  readonly step: number;
  readonly domain: string;
  readonly target: { type: dnsPacket.StringRecordType; value?: string };
};

/**
 * Follow CNAME for a desired record.
 */
const queryDnsFollowCname = async (
  options: Readonly<FollowCnameOptions>
): Promise<DNSRecord | null> => {
  if (options.step > MAX_CNAME_STEPS) {
    return null;
  }

  let nsInfo: NSInfo | null = null;
  try {
    nsInfo = await getAuthoritativeNs(options.domain);
  } catch (err) {
    // Failed to get authoritative NS - return null (will trigger fallback in public API)
    return null;
  }

  if (!nsInfo || nsInfo.nameservers.length === 0) {
    // No authoritative NS found.
    return null;
  }

  const questions: readonly dnsPacket.Question[] =
    options.target.type === 'CNAME'
      ? [
          {
            name: options.domain,
            type: 'CNAME'
          } satisfies dnsPacket.Question
        ]
      : [
          {
            name: options.domain,
            type: 'CNAME'
          } satisfies dnsPacket.Question,
          {
            name: options.domain,
            type: options.target.type
          } satisfies dnsPacket.Question
        ];

  const dnsResponse = await resolveWithNs(questions, nsInfo.nameservers);

  if (!dnsResponse) {
    // All tries failed
    return null;
  }

  // CNAME Loop detection
  if (options.visited.has(options.domain)) {
    throw new Error(
      `CNAME loop detected: ${options.domain} already visited in chain: ${Array.from(
        options.visited
      ).join(' -> ')}`
    );
  }

  const visited = new Set(options.visited).add(options.domain);

  // Typings not complete
  const rcode = (dnsResponse as any).rcode;
  if (dnsResponse.type === 'response' && rcode === 'NOERROR') {
    const records = extractStringAnswer(
      [
        ...(dnsResponse.answers ?? []),
        ...(dnsResponse.additionals ?? []),
        ...(dnsResponse.authorities ?? [])
      ] as StringAnswer[],
      ['CNAME', options.target.type]
    );
    const targetRecord = records.find(
      (record) =>
        record.type === options.target.type &&
        // Ignore value equality if not provided
        (options.target.value ? record.data === options.target.value : true)
    );

    // Target matched, returning.
    if (targetRecord) return targetRecord;

    // Use first CNAME record
    const cnameRecord = records.find((record) => record.type === 'CNAME');
    if (!cnameRecord) {
      return null;
    }

    return queryDnsFollowCname({
      domain: cnameRecord.data,
      step: options.step + 1,
      target: options.target,
      visited
    });
  }

  // NS returned an error
  if (dnsResponse.type === 'response' && isDefinitiveDNSError(rcode)) {
    return null;
  }

  // Unknown response type or code
  return null;
};

/**
 * Query CNAME record without caching.
 * @param domain - domain name
 * @param target - target CNAME value to match
 * @returns CNAME record matches the domain or not
 */
export const testCname = async (domain: string, target: string): Promise<DNSRecord | null> => {
  const result = await queryDnsFollowCname({
    domain,
    step: 0,
    target: {
      type: 'CNAME',
      value: target
    },
    visited: new Set<string>()
  });

  if (result === null) {
    try {
      const cnameRecords = await dns.resolveCname(domain);
      const firstCname = cnameRecords[0];
      if (firstCname && firstCname === target) {
        return {
          name: domain,
          type: 'CNAME',
          ttl: 0,
          data: firstCname
        };
      }
    } catch {
      // System DNS also failed, return null
    }
  }

  return result;
};

/**
 * Query A record without caching.
 * @param domain - domain name
 * @returns A record
 */
export const queryA = async (domain: string): Promise<DNSRecord | null> => {
  const result = await queryDnsFollowCname({
    domain,
    step: 0,
    target: {
      type: 'A'
    },
    visited: new Set<string>()
  });

  if (result === null) {
    try {
      const aRecords = await dns.resolve4(domain);
      const firstA = aRecords[0];
      if (firstA) {
        return {
          name: domain,
          type: 'A',
          ttl: 0,
          data: firstA
        };
      }
    } catch {
      // System DNS also failed, return null
    }
  }

  return result;
};

/**
 * Query AAAA record without caching.
 * @param domain - domain name
 * @returns AAAA record
 */
export const queryAAAA = async (domain: string): Promise<DNSRecord | null> => {
  const result = await queryDnsFollowCname({
    domain,
    step: 0,
    target: {
      type: 'AAAA'
    },
    visited: new Set<string>()
  });

  if (result === null) {
    try {
      const aaaaRecords = await dns.resolve6(domain);
      const firstAAAA = aaaaRecords[0];
      if (firstAAAA) {
        return {
          name: domain,
          type: 'AAAA',
          ttl: 0,
          data: firstAAAA
        };
      }
    } catch {
      // System DNS also failed, return null
    }
  }

  return result;
};
