import { DesktopTokenPayload } from '@/types/user';
import { verify } from 'jsonwebtoken';
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
  new Promise((resolve, reject) => {
    verify(token, appJwtSecret, (err, payload) => {
      if (err) {
        reject(err);
      } else if (!payload) {
        reject('payload is null');
      } else {
        resolve(payload as DesktopTokenPayload);
      }
    });
  });
