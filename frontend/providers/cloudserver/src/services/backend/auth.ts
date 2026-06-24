import { DesktopTokenPayload } from '@/types/user';
import { verifyJwtOrThrow } from '@sealos/shared/server/jwt';
import type { NextApiRequest } from 'next';
import { ERROR_ENUM } from '../error';

const appJwtSecret = (process.env.JWT_SECRET_APP as string) || '123456789';

export const verifyAccessToken = async (req: NextApiRequest) => {
  if (!req.headers) return Promise.reject(ERROR_ENUM.unAuthorization);
  const { authorization } = req.headers;
  if (!authorization) return Promise.reject(ERROR_ENUM.unAuthorization);
  return verifyDesktopToken(authorization);
};

export const verifyDesktopToken: (token: string) => Promise<DesktopTokenPayload> = (token) =>
  verifyJwtOrThrow<DesktopTokenPayload>(token, appJwtSecret);
