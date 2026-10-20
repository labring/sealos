import { AccessTokenPayload, GlobalTokenPayload } from '@/types/token';
import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccessToken, verifyGlobalToken } from '../auth';
import { jsonRes } from '../response';

/**
 * Enforces **regional token**.
 * @todo Rename legacy `AccessToken` to `RegionalToken`
 */
export const filterAccessToken = async (
  req: NextApiRequest,
  res: NextApiResponse,
  next: (data: AccessTokenPayload) => void
) => {
  const userData = await verifyAccessToken(req.headers);
  if (!userData)
    return jsonRes(res, {
      code: 401,
      message: 'invalid token'
    });
  else await Promise.resolve(next(userData));
};

/**
 * Enforces **global token**.
 * @todo Rename legacy `AuthenticationToken` to `GlobalToken`
 */
export const filterAuthenticationToken = async (
  req: NextApiRequest,
  res: NextApiResponse,
  next: (data: GlobalTokenPayload) => Promise<void>
) => {
  const userData = await verifyGlobalToken(req.headers);
  if (!userData)
    return jsonRes(res, {
      code: 401,
      message: 'invalid token'
    });
  else await next(userData);
};
