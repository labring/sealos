import { createHash } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import {
  ensureGlobalTokenClaims,
  generateMarketingConsentToken,
  verifyGlobalJwt
} from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import type { OAuth2AccessTokenPayload, OAuth2RefreshTokenPayload } from '@/types/token';
import { SHARED_AUTH_COOKIE_NAME } from '@/utils/cookieUtils';

const requestSchema = z
  .object({
    sea_attr: z.string().trim().max(16384).optional()
  })
  .strict();

type RawAttribution = {
  ad_personalization?: unknown;
  ad_user_data_consent?: unknown;
};

function decodeAttribution(value: string | undefined): RawAttribution {
  if (!value) {
    return {};
  }
  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    return decoded && typeof decoded === 'object' && !Array.isArray(decoded) ? decoded : {};
  } catch {
    return {};
  }
}

function consentState(value: unknown): 'granted' | 'denied' | 'unspecified' {
  if (value === true || value === 'granted') {
    return 'granted';
  }
  if (value === false || value === 'denied') {
    return 'denied';
  }
  return 'unspecified';
}

function requestToken(req: NextApiRequest): string | undefined {
  const cookieToken = req.cookies[SHARED_AUTH_COOKIE_NAME];
  if (cookieToken) {
    return cookieToken;
  }
  const headerToken = req.headers.authorization;
  if (!headerToken) {
    return undefined;
  }
  try {
    return decodeURIComponent(headerToken);
  } catch {
    return headerToken;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  try {
    const payload = await verifyGlobalJwt<OAuth2AccessTokenPayload | OAuth2RefreshTokenPayload>(
      requestToken(req)
    );
    const claims = ensureGlobalTokenClaims(payload);
    if (!claims) {
      return jsonRes(res, { code: 401, message: 'Unauthorized' });
    }

    const parsed = requestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return jsonRes(res, { code: 400, message: 'Invalid marketing consent payload' });
    }

    const attribution = decodeAttribution(parsed.data.sea_attr);
    const token = generateMarketingConsentToken({
      ad_personalization: consentState(attribution.ad_personalization),
      ad_user_data_consent: consentState(attribution.ad_user_data_consent),
      ...(parsed.data.sea_attr
        ? {
            attribution_hash: createHash('sha256').update(parsed.data.sea_attr).digest('hex')
          }
        : {}),
      region: global.AppConfig?.cloud.regionUID || 'unknown',
      sub: claims.sub
    });

    return jsonRes(res, { code: 200, data: { token } });
  } catch (error) {
    console.error('Marketing consent token error:', error);
    return jsonRes(res, { code: 503, message: 'Marketing consent signing is unavailable' });
  }
}
