import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { ensureGlobalTokenClaims, verifyGlobalJwt } from '@/services/backend/auth';
import { OAuth2AccessTokenPayload, OAuth2RefreshTokenPayload } from '@/types/token';
import { SHARED_AUTH_COOKIE_NAME } from '@/utils/cookieUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return jsonRes(res, {
      code: 405,
      message: 'Method not allowed'
    });
  }

  try {
    // Get token from cookie
    const token = req.cookies[SHARED_AUTH_COOKIE_NAME];

    if (!token) {
      return jsonRes(res, {
        code: 401,
        message: 'No authentication token found'
      });
    }

    // Verify token using global JWT secret (for global/authentication token)
    const payload = await verifyGlobalJwt<OAuth2AccessTokenPayload | OAuth2RefreshTokenPayload>(
      token
    );
    if (!payload) {
      return jsonRes(res, {
        code: 401,
        message: 'Invalid or expired token'
      });
    }

    const parsedPayload = ensureGlobalTokenClaims(payload);

    if (!parsedPayload) {
      return jsonRes(res, {
        code: 401,
        message: 'Invalid or expired token'
      });
    }

    // Return user basic information from oauth2 access token.
    return jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: {
        user_id: parsedPayload.user_id,
        sub: parsedPayload.sub
      }
    });
  } catch (err) {
    console.error('verifySharedToken error:', err);
    return jsonRes(res, {
      code: 500,
      message: 'Failed to verify token'
    });
  }
}
