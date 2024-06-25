import { AppTokenPayload, DesktopTokenPayload } from '@/types/user';
import { verify, sign } from 'jsonwebtoken';
import type { NextApiRequest } from 'next';
import { ERROR_ENUM } from '../error';

export const desktopJwtSecret = (process.env.JWT_SECRET_DESKTOP_TO_APP as string) || '123456789';
const appJwtSecret = (process.env.JWT_SECRET_SELF as string) || '123456789';

export const verifyAccessToken = async (req: NextApiRequest) => {
  if (!req.headers) return Promise.reject(ERROR_ENUM.unAuthorization);
  const { authorization } = req.headers;
  if (!authorization) return Promise.reject(ERROR_ENUM.unAuthorization);
  return verifyAppToken(authorization);
};

export const verifyDesktopToken = <T extends Object = DesktopTokenPayload>(token: string) =>
  new Promise<T | null>((resolve) => {
    verify(token, desktopJwtSecret, (err, payload) => {
      if (err) {
        console.log(err);
        resolve(null);
      } else if (!payload) {
        console.log('payload is null');
        resolve(null);
      } else {
        resolve(payload as T);
      }
    });
  });

export const verifyAppToken = <T extends Object = AppTokenPayload>(token: string) =>
  new Promise<T | null>((resolve, reject) => {
    verify(token, appJwtSecret, (err, payload) => {
      if (err) {
        console.log(err);
        resolve(null);
      } else if (!payload) {
        console.log('payload is null');
        resolve(null);
      } else {
        resolve(payload as T);
      }
    });
  });

export const generateAccessToken = (props: AppTokenPayload) =>
  sign(props, appJwtSecret, { expiresIn: '7d' });
