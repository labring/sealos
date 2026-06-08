import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { customAlphabet } from 'nanoid';
import crypto from 'crypto';
import { queryA, queryAAAA } from '@/services/dns-resolver';
import { Config } from '@/config';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { ResponseCode } from '@/types/response';
import { isIP } from 'net';
import https from 'https';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 16);

export interface AuthDomainChallengeParams {
  customDomain: string;
}

export const PRIVATE_HOSTNAME_SUFFIXES = ['.svc', '.svc.cluster.local', '.cluster.local'] as const;

const HOSTNAME_PATTERN =
  /^(?=.{1,253}$)(?:(?!-)[a-z0-9-]{1,63}(?<!-)\.)+(?!-)[a-z0-9-]{2,63}(?<!-)$/i;

const normalizeDomain = (domain: string) => domain.trim().replace(/\.$/, '').toLowerCase();
const getChallengePath = (token: string) =>
  `/api/.well-known/applaunchpad-domain-challenge/${token}`;
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

const parseIpv4 = (ip: string) => {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  const bytes = parts.map((part) => {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    return value >= 0 && value <= 255 ? value : null;
  });

  if (bytes.some((byte) => byte === null)) return null;
  return bytes as [number, number, number, number];
};

const ipv4BytesToAddress = (bytes: [number, number, number, number]) => bytes.join('.');

const ipv6WordsToIpv4 = (highWord: number, lowWord: number) => {
  return ipv4BytesToAddress([
    (highWord >> 8) & 0xff,
    highWord & 0xff,
    (lowWord >> 8) & 0xff,
    lowWord & 0xff
  ]);
};

const parseIpv6Words = (ip: string) => {
  const parts = ip.toLowerCase().split('::');
  if (parts.length > 2) return null;

  const parseSegments = (value: string) => {
    if (!value) return [];

    const segments = value.split(':');
    const words: number[] = [];

    for (const segment of segments) {
      if (segment.includes('.')) {
        const ipv4 = parseIpv4(segment);
        if (!ipv4) return null;
        words.push((ipv4[0] << 8) + ipv4[1], (ipv4[2] << 8) + ipv4[3]);
        continue;
      }

      if (!/^[0-9a-f]{1,4}$/.test(segment)) return null;
      words.push(parseInt(segment, 16));
    }

    return words;
  };

  const left = parseSegments(parts[0]);
  const right = parseSegments(parts[1] ?? '');
  if (!left || !right) return null;

  if (parts.length === 1) {
    return left.length === 8 ? left : null;
  }

  const missing = 8 - left.length - right.length;
  if (missing < 1) return null;

  return [...left, ...Array(missing).fill(0), ...right];
};

const isPrivateIpv4 = (ip: string) => {
  const bytes = parseIpv4(ip);
  if (!bytes) return true;

  const [first, second, third] = bytes;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  );
};

const isPrivateIpv6 = (ip: string) => {
  const normalizedIp = ip.toLowerCase();
  const words = parseIpv6Words(normalizedIp);
  if (!words) return true;

  const embeddedIpv4 = ipv6WordsToIpv4(words[6], words[7]);
  const isIpv4Compatible = words.slice(0, 6).every((word) => word === 0);
  const isIpv4Mapped = words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;
  const isSixToFour = words[0] === 0x2002;

  if (isIpv4Compatible || isIpv4Mapped) {
    return isPrivateIpv4(embeddedIpv4);
  }

  if (isSixToFour) {
    return isPrivateIpv4(ipv6WordsToIpv4(words[1], words[2]));
  }

  const firstSegment = parseInt(normalizedIp.split(':')[0], 16);

  return (
    normalizedIp === '::1' ||
    normalizedIp === '::' ||
    normalizedIp.startsWith('fc') ||
    normalizedIp.startsWith('fd') ||
    (firstSegment >= 0xfe80 && firstSegment <= 0xfebf) ||
    (firstSegment >= 0xff00 && firstSegment <= 0xffff) ||
    normalizedIp.startsWith('::ffff:0:') ||
    normalizedIp.startsWith('64:ff9b:')
  );
};

export const isPublicIp = (ip: string) => {
  const version = isIP(ip);
  if (version === 4) return !isPrivateIpv4(ip);
  if (version === 6) return !isPrivateIpv6(ip);
  return false;
};

export const sanitizeChallengeDomain = (customDomain: string) => {
  if (typeof customDomain !== 'string') return null;

  const domain = normalizeDomain(customDomain);

  if (
    !domain ||
    domain.includes('/') ||
    domain.includes('\\') ||
    domain.includes('?') ||
    domain.includes('#') ||
    domain.includes('@') ||
    domain.includes(':')
  ) {
    return null;
  }

  if (
    domain === 'localhost' ||
    PRIVATE_HOSTNAME_SUFFIXES.some((suffix) => domain.endsWith(suffix))
  ) {
    return null;
  }

  if (isIP(domain) || !HOSTNAME_PATTERN.test(domain)) {
    return null;
  }

  return domain;
};

export const formatChallengeHost = (host: string) => {
  return isIP(host) === 6 ? `[${host}]` : host;
};

const isRedirectResponse = (response: Response) => REDIRECT_STATUS_CODES.has(response.status);

const getSafeHttpsRedirectUrl = (
  response: Response,
  verifiedDomain: string,
  challengePath: string
) => {
  if (!isRedirectResponse(response)) return null;

  const location = response.headers.get('location');
  if (!location) return null;

  let redirectUrl: URL;
  try {
    redirectUrl = new URL(location, `http://${verifiedDomain}${challengePath}`);
  } catch {
    return null;
  }

  if (
    redirectUrl.protocol !== 'https:' ||
    normalizeDomain(redirectUrl.hostname) !== verifiedDomain ||
    redirectUrl.pathname !== challengePath ||
    redirectUrl.search ||
    redirectUrl.hash ||
    redirectUrl.username ||
    redirectUrl.password ||
    (redirectUrl.port && redirectUrl.port !== '443')
  ) {
    return null;
  }

  return redirectUrl.toString();
};

const fetchChallengeUrl = (url: string, verifiedDomain: string) => {
  return fetch(url, {
    method: 'GET',
    redirect: 'manual',
    headers: {
      Host: verifiedDomain,
      'User-Agent': 'Sealos-AppLaunchpad-Domain-Verifier/1.0'
    },
    // Set timeout to 10 seconds
    signal: AbortSignal.timeout(10000)
  });
};

const toResponseHeaders = (headers: Record<string, string | string[] | undefined>) => {
  const responseHeaders = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => responseHeaders.append(key, item));
    } else if (value !== undefined) {
      responseHeaders.set(key, value);
    }
  }

  return responseHeaders;
};

const fetchHttpsChallengeUrlByHost = (
  url: string,
  verifiedDomain: string,
  host: string
): Promise<Response> => {
  const redirectUrl = new URL(url);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: 'https:',
        hostname: host,
        port: redirectUrl.port ? Number(redirectUrl.port) : 443,
        path: redirectUrl.pathname,
        method: 'GET',
        servername: verifiedDomain,
        headers: {
          Host: verifiedDomain,
          'User-Agent': 'Sealos-AppLaunchpad-Domain-Verifier/1.0'
        },
        signal: AbortSignal.timeout(10000)
      },
      (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on('end', () => {
          resolve(
            new Response(Buffer.concat(chunks), {
              status: res.statusCode || 500,
              headers: toResponseHeaders(res.headers)
            })
          );
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
};

const fetchHttpsChallengeUrl = async (
  url: string,
  verifiedDomain: string,
  resolvedHosts: string[]
) => {
  let lastResponse: Response | null = null;

  for (const host of resolvedHosts) {
    const response = await fetchHttpsChallengeUrlByHost(url, verifiedDomain, host).catch(
      () => null
    );
    if (!response) continue;

    lastResponse = response;
    if (response.ok) break;
  }

  return lastResponse;
};

const resolveChallengeHosts = async (verifiedDomain: string) => {
  const ip4 = await queryA(verifiedDomain).catch((e) => {
    console.error('Failed to resolve IPv4 address:', e);
    return null;
  });
  const ip6 = await queryAAAA(verifiedDomain).catch((e) => {
    console.error('Failed to resolve IPv6 address:', e);
    return null;
  });

  const resolvedHosts = [ip4?.data, ip6?.data].filter((host): host is string => !!host);
  const nonPublicHost = resolvedHosts.find((host) => !isPublicIp(host));

  return { nonPublicHost, resolvedHosts };
};

const authenticateRequest = async (req: NextApiRequest) => {
  const kubeconfig = await authSession(req.headers);
  const { k8sCore, namespace } = await getK8s({ kubeconfig });
  await k8sCore.listNamespacedService(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    1
  );
};

const getAuthErrorCode = (error: any) => {
  if (error === 'unAuthorization') return ResponseCode.UNAUTHORIZED;

  const statusCode =
    error?.body?.code ||
    error?.response?.status ||
    error?.response?.statusCode ||
    error?.status ||
    error?.statusCode;

  if (statusCode === ResponseCode.UNAUTHORIZED || statusCode === ResponseCode.FORBIDDEN) {
    return statusCode;
  }

  return null;
};

function isTimestampValid(timestamp: number, maxAge: number = 600): boolean {
  const now = Math.floor(Date.now() / 1000);
  const age = now - timestamp;
  return Math.abs(age) <= maxAge;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    try {
      await authenticateRequest(req);
    } catch (authError) {
      const authErrorCode = getAuthErrorCode(authError);
      if (!authErrorCode) {
        throw authError;
      }

      return jsonRes(res, {
        code: authErrorCode,
        error: {
          code: authErrorCode === ResponseCode.FORBIDDEN ? 'FORBIDDEN' : 'UNAUTHORIZED',
          message:
            authErrorCode === ResponseCode.FORBIDDEN
              ? 'Insufficient permissions'
              : 'Authentication required'
        }
      });
    }

    const { customDomain } = req.body as AuthDomainChallengeParams;

    if (!customDomain) {
      return jsonRes(res, {
        code: 400,
        error: 'Missing required parameter: customDomain'
      });
    }

    const verifiedDomain = sanitizeChallengeDomain(customDomain);
    if (!verifiedDomain) {
      return jsonRes(res, {
        code: ResponseCode.BAD_REQUEST,
        error: {
          code: 'INVALID_CUSTOM_DOMAIN',
          message: 'customDomain must be a public hostname without port, path, query, or fragment'
        }
      });
    }

    const token = nanoid();
    const challengePath = getChallengePath(token);
    const { nonPublicHost, resolvedHosts } = await resolveChallengeHosts(verifiedDomain);

    if (nonPublicHost) {
      return jsonRes(res, {
        code: ResponseCode.BAD_REQUEST,
        error: {
          code: 'PRIVATE_ADDRESS_NOT_ALLOWED',
          message: 'customDomain must not resolve to a private or reserved address'
        }
      });
    }

    if (resolvedHosts.length === 0) {
      return jsonRes(res, {
        code: ResponseCode.BAD_REQUEST,
        error: {
          code: 'DOMAIN_RESOLVE_FAILED',
          message: 'customDomain must resolve to a public A or AAAA record'
        }
      });
    }

    const challengeUrls = resolvedHosts.map((host) => {
      return `http://${formatChallengeHost(host)}${challengePath}`;
    });

    console.log('URLs to attempt for domain', verifiedDomain, ':', challengeUrls);

    let response: Response | null = null;
    let challengeUrl: string | null = null;
    for (const url of challengeUrls) {
      console.log('Attempting domain challenge:', url);
      challengeUrl = url;

      response = await fetchChallengeUrl(url, verifiedDomain).catch(() => null);

      const httpsRedirectUrl = response
        ? getSafeHttpsRedirectUrl(response, verifiedDomain, challengePath)
        : null;

      if (httpsRedirectUrl) {
        const redirectResolution = await resolveChallengeHosts(verifiedDomain);
        if (redirectResolution.nonPublicHost || redirectResolution.resolvedHosts.length === 0) {
          response = null;
          continue;
        }

        challengeUrl = httpsRedirectUrl;
        response = await fetchHttpsChallengeUrl(
          httpsRedirectUrl,
          verifiedDomain,
          redirectResolution.resolvedHosts
        ).catch(() => null);
      }

      // Try every URL until one succeeds or all fail
      if (response?.ok) {
        break;
      }
    }

    try {
      if (!response) {
        return jsonRes(res, {
          code: 400,
          error: {
            code: 'CHALLENGE_REQUEST_FAILED',
            message: 'Challenge request failed',
            status: 400,
            url: challengeUrl
          }
        });
      }

      if (!response.ok) {
        return jsonRes(res, {
          code: 400,
          error: {
            code: 'CHALLENGE_REQUEST_FAILED',
            message: `Challenge request failed with status: ${response.status}`,
            status: response.status,
            url: challengeUrl
          }
        });
      }

      const challengeResponse = await response.json();
      const challengeData = challengeResponse.data || challengeResponse; // Handle both formats

      // Validate required fields
      if (
        !challengeData.signature ||
        !challengeData.host ||
        !challengeData.token ||
        !challengeData.timestamp ||
        !challengeData.service
      ) {
        return jsonRes(res, {
          code: 400,
          error: {
            code: 'INVALID_CHALLENGE_RESPONSE',
            message:
              'Challenge response missing required fields (signature, host, token, timestamp, service)'
          }
        });
      }

      // Validate timestamp to prevent replay attacks
      if (!isTimestampValid(challengeData.timestamp)) {
        return jsonRes(res, {
          code: 400,
          error: {
            code: 'TIMESTAMP_EXPIRED',
            message: 'Challenge response timestamp is expired or invalid',
            timestamp: challengeData.timestamp,
            now: Math.floor(Date.now() / 1000)
          }
        });
      }

      // Validate service field
      if (challengeData.service !== 'applaunchpad') {
        return jsonRes(res, {
          code: 400,
          error: {
            code: 'INVALID_SERVICE',
            message: 'Challenge response service field mismatch',
            expected: 'applaunchpad',
            received: challengeData.service
          }
        });
      }

      // Verify the signature using the same format as the challenge endpoint
      const secret = Config().launchpad.domainChallengeSecret;

      const signatureData = `${challengeData.host}:${challengeData.token}:${challengeData.timestamp}:${challengeData.service}:${challengeData.isProxy}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signatureData)
        .digest('hex');

      if (challengeData.signature !== expectedSignature) {
        return jsonRes(res, {
          code: 400,
          error: {
            code: 'SIGNATURE_VERIFICATION_FAILED',
            message: 'Domain challenge signature verification failed'
          }
        });
      }

      // Verify that the token matches what we sent
      if (challengeData.token !== token) {
        return jsonRes(res, {
          code: 400,
          error: {
            code: 'TOKEN_MISMATCH',
            message: 'Challenge token mismatch',
            expected: token,
            received: challengeData.token
          }
        });
      }

      // Verify that the host matches the custom domain
      if (challengeData.host !== verifiedDomain) {
        return jsonRes(res, {
          code: 400,
          error: {
            code: 'HOST_MISMATCH',
            message: 'Challenge host mismatch',
            expected: verifiedDomain,
            received: challengeData.host
          }
        });
      }

      console.log('Domain challenge successful for:', verifiedDomain);

      jsonRes(res, {
        data: {
          verified: true,
          domain: verifiedDomain,
          challengeUrl,
          proxy: {
            isProxy: challengeData.isProxy || false
          }
        },
        message: 'Domain ownership verified successfully'
      });
    } catch (fetchError: any) {
      console.log('Domain challenge fetch error:', fetchError);

      if (fetchError.name === 'TimeoutError') {
        return jsonRes(res, {
          code: 400,
          error: {
            code: 'CHALLENGE_TIMEOUT',
            message: `Challenge request timeout for domain: ${verifiedDomain}`,
            url: challengeUrl
          }
        });
      }

      return jsonRes(res, {
        code: 400,
        error: {
          code: 'CHALLENGE_NETWORK_ERROR',
          message: `Network error during challenge request: ${fetchError.message}`,
          url: challengeUrl,
          originalError: fetchError.code || fetchError.name
        }
      });
    }
  } catch (error: any) {
    console.log('Domain challenge error:', error);
    jsonRes(res, {
      code: 500,
      error: {
        code: 'INTERNAL_ERROR',
        message: error?.message || 'Internal server error during domain challenge'
      }
    });
  }
}
