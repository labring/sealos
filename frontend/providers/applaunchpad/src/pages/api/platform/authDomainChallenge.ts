import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { customAlphabet } from 'nanoid';
import crypto from 'crypto';
import { queryA, queryAAAA } from '@/services/dns-resolver';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 16);

export interface AuthDomainChallengeParams {
  customDomain: string;
}

function isTimestampValid(timestamp: number, maxAge: number = 600): boolean {
  const now = Math.floor(Date.now() / 1000);
  const age = now - timestamp;
  return Math.abs(age) <= maxAge;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { customDomain } = req.body as AuthDomainChallengeParams;

    if (!customDomain) {
      return jsonRes(res, {
        code: 400,
        error: 'Missing required parameter: customDomain'
      });
    }

    const ip4 = await queryA(customDomain).catch((e) => {
      console.error('Failed to resolve IPv4 address:', e);
      return null;
    });
    const ip6 = await queryAAAA(customDomain).catch((e) => {
      console.error('Failed to resolve IPv6 address:', e);
      return null;
    });

    const token = nanoid();

    const challengeUrls = [ip4?.data, ip6?.data, customDomain].flatMap((host) => {
      if (!host) return [];
      return [`http://${host}/api/.well-known/applaunchpad-domain-challenge/${token}`];
    });

    console.log('URLs to attempt for domain', customDomain, ':', challengeUrls);

    let response: Response | null = null;
    let challengeUrl: string | null = null;
    for (const url of challengeUrls) {
      console.log('Attempting domain challenge:', url);
      challengeUrl = url;

      // Make HTTP request to user's domain
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Host: customDomain,
          'User-Agent': 'Sealos-AppLaunchpad-Domain-Verifier/1.0'
        },
        // Set timeout to 10 seconds
        signal: AbortSignal.timeout(10000)
      }).catch(() => null);

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
              'Challenge response missing required fields (signature, host, token, timestamp, service)',
            response: challengeResponse
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
      const secret =
        global.AppConfig?.launchpad?.domainChallengeSecret ||
        'default-dev-secret-change-in-production';

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
            message: 'Domain challenge signature verification failed',
            expected: expectedSignature,
            received: challengeData.signature,
            signatureData
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
      if (challengeData.host !== customDomain) {
        return jsonRes(res, {
          code: 400,
          error: {
            code: 'HOST_MISMATCH',
            message: 'Challenge host mismatch',
            expected: customDomain,
            received: challengeData.host
          }
        });
      }

      console.log('Domain challenge successful for:', customDomain);

      jsonRes(res, {
        data: {
          verified: true,
          domain: customDomain,
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
            message: `Challenge request timeout for domain: ${customDomain}`,
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
