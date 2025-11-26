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

export type QueryOptions = {
  recursionDesired: boolean;
};

/**
 * Error codes for DNS resolution errors
 */
export const ResolveErrorCode = {
  /** CNAME loop detected */
  CNAME_LOOP: 'CNAME_LOOP',
  /** Network timeout */
  TIMEOUT: 'TIMEOUT',
  /** No record found (NXDOMAIN) */
  NO_RECORD: 'NO_RECORD',
  /** CNAME target mismatch */
  CNAME_MISMATCH: 'CNAME_MISMATCH',
  /** DNS server returned error (SERVFAIL, REFUSED, etc.) */
  DNS_ERROR: 'DNS_ERROR',
  /** Maximum CNAME steps exceeded */
  MAX_CNAME_STEPS_EXCEEDED: 'MAX_CNAME_STEPS_EXCEEDED',
  /** No authoritative NS servers found */
  NO_AUTHORITATIVE_NS: 'NO_AUTHORITATIVE_NS',
  /** Domain level exceeds limit */
  DOMAIN_TOO_LONG: 'DOMAIN_TOO_LONG'
} as const;

export type ResolveErrorCode = (typeof ResolveErrorCode)[keyof typeof ResolveErrorCode];

/**
 * DNS resolution error with specific error code
 */
export class ResolveError extends Error {
  readonly code: ResolveErrorCode;
  readonly domain?: string;
  readonly details?: unknown;

  constructor(
    code: ResolveErrorCode,
    message: string,
    options?: { domain?: string; details?: unknown }
  ) {
    super(message);
    this.name = 'ResolveError';
    this.code = code;
    if (options?.domain !== undefined) {
      this.domain = options.domain;
    }
    if (options?.details !== undefined) {
      this.details = options.details;
    }
  }
}

// Constants
const QUERY_TIMEOUT = 5000 as const;
const MAX_DOMAIN_LEVELS = 10 as const;
const MAX_CNAME_STEPS = 4 as const;
const MAX_NAMESERVERS = 3 as const;
const ROOT_NS_SERVER: Nameserver = {
  ns: 'a.root-servers.net',
  resolveIPv4: async () => '198.41.0.4',
  resolveIPv6: async () => '2001:503:ba3e::2:30'
} as const;

const DEFAULT_QUERY_OPTS: QueryOptions = {
  recursionDesired: false
};

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
  name: string,
  type: dnsPacket.StringRecordType,
  server: string,
  options: QueryOptions = DEFAULT_QUERY_OPTS
): Promise<Packet> => {
  const socketType = isIPv6(server) ? 'udp6' : 'udp4';

  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket(socketType);
    const query = dnsPacket.encode({
      type: 'query',
      id: Math.floor(Math.random() * 65535),
      // No recursive queries
      flags: options.recursionDesired ? dnsPacket.RECURSION_DESIRED : 0,
      questions: [
        {
          name,
          type
        }
      ]
    });

    const timer = setTimeout(() => {
      socket.close();
      reject(
        new ResolveError(ResolveErrorCode.TIMEOUT, `Timeout querying ${server} for DNS answers`, {
          domain: name,
          details: { server }
        })
      );
    }, QUERY_TIMEOUT);

    socket.on('message', (msg, rinfo) => {
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

const resolveIPv4Address = async (host: string) => {
  try {
    const ipResult = await dns.resolve4(host);

    return ipResult[0] ?? null;
  } catch {
    return null;
  }
};

const resolveIPv6Address = async (host: string) => {
  try {
    const ipResult = await dns.resolve6(host);

    return ipResult[0] ?? null;
  } catch {
    return null;
  }
};

/**
 * Extract NS servers with their possible IP addresses from DNS answers.
 * @returns a list of NS servers with lazy IP resolution (max MAX_NAMESERVERS).
 */
export const extractNSServers = (
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

  return Array.from(nsWithPossibleAddresses.entries())
    .map(([ns, addresses]): Nameserver => {
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

          return resolveIPv4Address(ns);
        },
        resolveIPv6: async (): Promise<string | null> => {
          if (glueAAAA) {
            return glueAAAA;
          }

          return resolveIPv6Address(ns);
        }
      };
    })
    .slice(0, MAX_NAMESERVERS);
};

/**
 * Resolve NS servers and query DNS records with retry logic.
 * Tries each NS server in order until one succeeds.
 * @param questions - DNS questions to query
 * @param nameservers - List of NS servers
 * @returns DNS response packet or null if all servers failed
 */
export const resolveWithNs = async (
  name: string,
  type: dnsPacket.StringRecordType,
  nameservers: readonly Nameserver[],
  options?: QueryOptions
): Promise<
  | (Packet & {
      readonly ns: {
        readonly host: string;
        readonly ip: string;
      };
    })
  | null
> => {
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

      const dnsResponse = await queryDns(name, type, ip, options);
      if (dnsResponse.type === 'response') {
        const rcode = (dnsResponse as any).rcode;
        if (rcode === 'NOERROR') {
          // Only return success if we have answers (or if it's an NS query with authorities)
          const hasAnswers = dnsResponse.answers && dnsResponse.answers.length > 0;
          const hasAuthorities = dnsResponse.authorities && dnsResponse.authorities.length > 0;
          // For NS queries, authorities are acceptable
          if (hasAnswers || (type === 'NS' && hasAuthorities)) {
            // Success
            return {
              ...dnsResponse,
              ns: {
                host: nsServer.ns,
                ip: ip
              }
            };
          }
          // NOERROR but no answers/authorities, try next NS
        }

        // Other response codes, try next NS
      }
    } catch (err) {
      // Query failed or network error, try next NS
      // Store error for later if all NS fail
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
export const getAuthoritativeNsFromRoot = async (domain: string): Promise<NSInfo | null> => {
  const parts = domain
    .split('.')
    .filter((p) => p.length > 0)
    .slice()
    .reverse();

  if (parts.length > MAX_DOMAIN_LEVELS) {
    throw new ResolveError(
      ResolveErrorCode.DOMAIN_TOO_LONG,
      `Domain level exceeds the limit of ${MAX_DOMAIN_LEVELS}`,
      { domain }
    );
  }

  const findNSRecursive = async (
    testDomain: string,
    remainingParts: readonly string[],
    lastValidNSInfo: NSInfo | null = null
  ): Promise<NSInfo | null> => {
    // Use NS servers from lastValidNSInfo if available, otherwise use root server
    const nsServersToQuery = lastValidNSInfo ? lastValidNSInfo.nameservers : [ROOT_NS_SERVER];

    const nsResponse = await resolveWithNs(testDomain, 'NS', nsServersToQuery, {
      recursionDesired: true
    });

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

export const getAuthoritativeNsFromLocal = async (domain: string): Promise<NSInfo | null> => {
  const localNs = dns.getServers();
  if (localNs.length === 0) {
    return null;
  }

  const parts = domain.split('.').filter((part) => part.length > 0);

  if (parts.length === 0) {
    return null;
  }

  if (parts.length > MAX_DOMAIN_LEVELS) {
    throw new ResolveError(
      ResolveErrorCode.DOMAIN_TOO_LONG,
      `Domain level exceeds the limit of ${MAX_DOMAIN_LEVELS}`,
      { domain }
    );
  }

  const queryFromLocalResolvers = async (target: string): Promise<NSInfo | null> => {
    for (const resolver of localNs) {
      try {
        const response = await queryDns(target, 'NS', resolver, {
          recursionDesired: true
        });

        if (response.type !== 'response') {
          continue;
        }

        const rcode = (response as any).rcode;
        if (rcode !== 'NOERROR') {
          continue;
        }

        const answers = [
          ...(response.answers ?? []),
          ...(response.authorities ?? []),
          ...(response.additionals ?? [])
        ];

        const nsServersWithIP = extractNSServers(target, answers);
        if (nsServersWithIP.length > 0) {
          return {
            zone: target,
            nameservers: nsServersWithIP
          };
        }
      } catch {
        // Ignore network/time-out errors for this resolver.
        continue;
      }
    }

    return null;
  };

  for (let i = 0; i < parts.length; i += 1) {
    const zoneCandidate = parts.slice(i).join('.');
    const result = await queryFromLocalResolvers(zoneCandidate);

    if (result) {
      return result;
    }
  }

  return null;
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
): Promise<
  DNSRecord & {
    readonly ns: {
      readonly host: string;
      readonly ip: string;
    };
  }
> => {
  if (options.step > MAX_CNAME_STEPS) {
    throw new ResolveError(
      ResolveErrorCode.MAX_CNAME_STEPS_EXCEEDED,
      `Maximum CNAME steps (${MAX_CNAME_STEPS}) exceeded for domain ${options.domain}`,
      {
        domain: options.domain,
        details: { step: options.step, visited: Array.from(options.visited) }
      }
    );
  }

  let nsInfo: NSInfo | null = null;
  try {
    nsInfo = await getAuthoritativeNsFromLocal(options.domain);

    if (!nsInfo || nsInfo.nameservers.length === 0) {
      nsInfo = await getAuthoritativeNsFromRoot(options.domain);
    }
  } catch (err) {
    // Failed to get authoritative NS - re-throw as ResolveError if not already
    if (err instanceof ResolveError) {
      throw err;
    }
    throw new ResolveError(
      ResolveErrorCode.NO_AUTHORITATIVE_NS,
      `Failed to get authoritative NS for domain ${options.domain}`,
      { domain: options.domain, details: { originalError: err } }
    );
  }

  if (!nsInfo || nsInfo.nameservers.length === 0) {
    // No authoritative NS found.
    throw new ResolveError(
      ResolveErrorCode.NO_AUTHORITATIVE_NS,
      `No authoritative NS servers found for domain ${options.domain}`,
      { domain: options.domain }
    );
  }

  const dnsResponse = await resolveWithNs(options.domain, options.target.type, nsInfo.nameservers, {
    recursionDesired: true
  });

  if (!dnsResponse) {
    // All tries failed - could be network error or no response
    throw new ResolveError(
      ResolveErrorCode.NO_RECORD,
      `All authoritative NS servers failed for domain ${options.domain}`,
      { domain: options.domain }
    );
  }

  // CNAME Loop detection
  if (options.visited.has(options.domain)) {
    throw new ResolveError(
      ResolveErrorCode.CNAME_LOOP,
      `CNAME loop detected: ${options.domain} already visited`,
      {
        domain: options.domain,
        details: {
          chain: Array.from(options.visited).join(' -> '),
          visited: Array.from(options.visited)
        }
      }
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
    if (targetRecord)
      return {
        ...targetRecord,
        ns: dnsResponse.ns
      };

    // Use first CNAME record
    const cnameRecord = records.find((record) => record.type === 'CNAME');
    if (!cnameRecord) {
      // No CNAME record found, and target record also not found
      throw new ResolveError(
        ResolveErrorCode.NO_RECORD,
        `No ${options.target.type} record pointing to domain ${options.target.value}`,
        {
          domain: options.domain,
          details: {
            query: options,
            response: dnsResponse
          }
        }
      );
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
    throw new ResolveError(
      ResolveErrorCode.DNS_ERROR,
      `DNS server returned error code: ${rcode} for domain ${options.domain}`,
      {
        domain: options.domain,
        details: {
          query: options,
          response: dnsResponse
        }
      }
    );
  }

  // Unknown response type or code
  throw new ResolveError(
    ResolveErrorCode.DNS_ERROR,
    `Unknown DNS response for domain ${options.domain}`,
    {
      domain: options.domain,
      details: {
        query: options,
        response: dnsResponse
      }
    }
  );
};

/**
 * Query CNAME record without caching.
 * @param domain - domain name
 * @param target - target CNAME value to match
 * @returns CNAME record
 * @throws ResolveError if no record or any error occurred.
 */
export const testCname = async (domain: string, target: string): Promise<DNSRecord> => {
  const result = await queryDnsFollowCname({
    domain,
    step: 0,
    target: {
      type: 'CNAME',
      value: target
    },
    visited: new Set<string>()
  });

  // Check if CNAME value matches target
  if (result && result.data !== target) {
    throw new ResolveError(
      ResolveErrorCode.CNAME_MISMATCH,
      `CNAME record for ${domain} points to ${result.data}, expected ${target}`,
      {
        domain,
        details: {
          actual: result.data,
          expected: target,
          result: result
        }
      }
    );
  }

  return result;
};

/**
 * Query A record without caching.
 * @param domain - domain name
 * @returns A record
 * @throws ResolveError if no record or any error occurred.
 *
 */
export const queryA = async (domain: string): Promise<DNSRecord> => {
  return await queryDnsFollowCname({
    domain,
    step: 0,
    target: {
      type: 'A'
    },
    visited: new Set<string>()
  });
};

/**
 * Query AAAA record without caching.
 * @param domain - domain name
 * @returns AAAA record
 * @throws ResolveError if no record or any error occurred.
 *
 */
export const queryAAAA = async (domain: string): Promise<DNSRecord> => {
  return await queryDnsFollowCname({
    domain,
    step: 0,
    target: {
      type: 'AAAA'
    },
    visited: new Set<string>()
  });
};
