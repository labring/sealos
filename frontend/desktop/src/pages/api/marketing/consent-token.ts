import { createHash } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import {
  ensureGlobalTokenClaims,
  generateMarketingConsentToken,
  verifyAccessToken,
  verifyGlobalJwt,
  verifyGlobalToken
} from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import type { OAuth2AccessTokenPayload, OAuth2RefreshTokenPayload } from '@/types/token';
import { SHARED_AUTH_COOKIE_NAME } from '@/utils/cookieUtils';

const requestSchema = z
  .object({
    sea_attr: z.string().trim().min(1).max(16384)
  })
  .strict();

async function requestUserUid(req: NextApiRequest): Promise<string | undefined> {
  const cookieClaims = ensureGlobalTokenClaims(
    await verifyGlobalJwt<OAuth2AccessTokenPayload | OAuth2RefreshTokenPayload>(
      req.cookies[SHARED_AUTH_COOKIE_NAME]
    )
  );
  if (cookieClaims) return cookieClaims.sub;

  const globalClaims = await verifyGlobalToken(req.headers);
  if (globalClaims) return globalClaims.userUid;

  return (await verifyAccessToken(req.headers))?.userUid;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');

  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: 'Method not allowed' });
  }

  try {
    const userUid = await requestUserUid(req);
    if (!userUid) {
      return jsonRes(res, { code: 401, message: 'Unauthorized' });
    }

    const parsed = requestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return jsonRes(res, { code: 400, message: 'Invalid marketing consent payload' });
    }

    const token = generateMarketingConsentToken({
      // Browser attribution is not proof of user consent. Keep the receipt
      // fail-closed until a trusted CMP/Consent Mode source is wired here.
      ad_personalization: 'unspecified',
      ad_user_data_consent: 'unspecified',
      attribution_hash: createHash('sha256').update(parsed.data.sea_attr).digest('hex'),
      region: global.AppConfig?.cloud.regionUID || 'unknown',
      sub: userUid
    });

    return jsonRes(res, { code: 200, data: { token } });
  } catch (error) {
    console.error('Marketing consent token error:', error);
    return jsonRes(res, { code: 503, message: 'Marketing consent signing is unavailable' });
  }
}
