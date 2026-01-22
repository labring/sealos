import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { verifyJWT } from '@/services/backend/auth';
import { AccessTokenPayload } from '@/types/token';

const SHARED_AUTH_COOKIE_NAME = 'sealos_auth_token';

// Get internal JWT secret (same as verifyAppToken uses)
const internalJwtSecret = () => global.AppConfig?.desktop.auth.jwt.internal || '123456789';

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

    // Verify token using internal JWT secret (same as verifyAppToken)
    const payload = await verifyJWT<AccessTokenPayload>(token, internalJwtSecret());

    if (!payload) {
      return jsonRes(res, {
        code: 401,
        message: 'Invalid or expired token'
      });
    }

    // Return user basic information
    return jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: {
        userId: payload.userId,
        userUid: payload.userUid,
        workspaceId: payload.workspaceId
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
