import { jsonRes } from '../response';
import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccessToken, verifyAuthenticationToken } from '../auth';
import { AccessTokenPayload, AuthenticationTokenPayload } from '@/types/token';

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

export const filterAuthenticationToken = async (
  req: NextApiRequest,
  res: NextApiResponse,
  next: (data: AuthenticationTokenPayload) => Promise<void>
) => {
  const userData = await verifyAuthenticationToken(req.headers);
  if (!userData)
    return jsonRes(res, {
      code: 401,
      message: 'invalid token'
    });
  else await next(userData);
};
