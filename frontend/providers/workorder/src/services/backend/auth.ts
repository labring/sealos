import { AppTokenPayload, DesktopTokenPayload } from '@/types/user';
import { verify, sign } from 'jsonwebtoken';
import type { NextApiRequest } from 'next';
import { ERROR_ENUM } from '../error';
import { reject } from 'lodash';

const desktopJwtSecret = (process.env.DESKTOP_JWT_SECRET as string) || '123456789';
const appJwtSecret = (process.env.APP_JWT_SECRET as string) || '123456789';

export const verifyAccessToken = async (req: NextApiRequest) => {
  if (!req.headers) return Promise.reject(ERROR_ENUM.unAuthorization);
  const { authorization } = req.headers;
  if (!authorization) return Promise.reject(ERROR_ENUM.unAuthorization);
  return verifyAppToken(authorization);
};

export const verifyDesktopToken: (token: string) => Promise<DesktopTokenPayload | null> = (token) =>
  new Promise((resolve) => {
    verify(token, desktopJwtSecret, (err, payload) => {
      if (err) {
        console.log(err);
        resolve(null);
      } else if (!payload) {
        console.log('payload is null');
        resolve(null);
      } else {
        resolve(payload as DesktopTokenPayload);
      }
    });
  });

export const verifyAppToken: (token: string) => Promise<AppTokenPayload> = (token) =>
  new Promise((resolve) => {
    verify(token, appJwtSecret, (err, payload) => {
      if (err) {
        reject(err);
      } else if (!payload) {
        reject('payload is null');
      } else {
        resolve(payload as AppTokenPayload);
      }
    });
  });

export const generateAccessToken = (props: AppTokenPayload) =>
  sign(props, appJwtSecret, { expiresIn: '7d' });
