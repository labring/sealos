import { sign, verify } from 'jsonwebtoken';
import { Config } from '@/config';

const internalJwtSecret = () => Config().costCenter.auth.jwt.internal;

const billingJwtSecret = () => Config().costCenter.auth.jwt.billing;

export type AuthenticationTokenPayload = {
  userUid: string;
  userId: string;
};
export type AccessTokenPayload = {
  regionUid: string;
  userCrUid: string;
  userCrName: string;
  workspaceUid: string;
  workspaceId: string;
} & AuthenticationTokenPayload;

export const verifyJWT = <T extends Object = AccessTokenPayload>(token: string, secret: string) =>
  new Promise<T | null>((resolve) => {
    if (!token) return resolve(null);
    verify(token, secret, (err, payload) => {
      if (err) {
        resolve(null);
      } else if (!payload) {
        resolve(null);
      } else {
        resolve(payload as T);
      }
    });
  });

export const generateBillingToken = (props: AuthenticationTokenPayload) =>
  sign(props, billingJwtSecret(), { expiresIn: '5d' });

export const verifyInternalToken = (token: string) =>
  verifyJWT<AccessTokenPayload>(token, internalJwtSecret());
