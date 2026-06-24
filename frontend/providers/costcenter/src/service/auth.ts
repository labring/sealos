import { Config } from '@/config';
import { signJwt, verifyJwt as verifySharedJwt } from '@sealos/shared/server/jwt';

const internalJwtSecret = () => Config().costCenter.auth.jwt.internal;

const billingJwtSecret = () => Config().costCenter.components.billing.secret;

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

export const verifyJWT = <T extends object = AccessTokenPayload>(token: string, secret: string) =>
  verifySharedJwt<T>(token, secret);

export const generateBillingToken = (props: AuthenticationTokenPayload) =>
  signJwt(props, billingJwtSecret(), { expiresIn: '5d' });

export const verifyInternalToken = (token: string) =>
  verifyJWT<AccessTokenPayload>(token, internalJwtSecret());
