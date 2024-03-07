import { IncomingHttpHeaders } from 'http';
import { sign, verify } from 'jsonwebtoken';
import { JWTPayload } from '@/types';
import { AuthenticationTokenPayload, AccessTokenPayload } from '@/types/token';
import { getRegionUid } from '@/services/enable';

const jwtSecret = (process.env.JWT_SECRET as string) || '123456789';
const regionJwtSecret = process.env.JWT_SECRET_REGION || '123456789';
const verifyToken = async <T extends Object>(header: IncomingHttpHeaders) => {
  try {
    if (!header?.authorization) {
      throw new Error('缺少凭证');
    }
    const token = decodeURIComponent(header.authorization);
    const payload = await verifyJWT<T>(token);
    return payload;
  } catch (err) {
    console.error(err);
    return null;
  }
};
export const verifyAccessToken = async (header: IncomingHttpHeaders) =>
  verifyToken<AccessTokenPayload>(header).then(
    (payload) => {
      if (payload?.regionUid === getRegionUid()) {
        return payload;
      } else {
        return null;
      }
    },
    (err) => null
  );
export const verifyAuthenticationToken = async (header: IncomingHttpHeaders) => {
  try {
    if (!header?.authorization) {
      throw new Error('缺少凭证');
    }
    const token = decodeURIComponent(header.authorization);
    const payload = await verifyJWT<AuthenticationTokenPayload>(token, regionJwtSecret);
    return payload;
  } catch (err) {
    console.error(err);
    return null;
  }
};
export const verifyJWT = <T extends Object = JWTPayload>(token?: string, secret?: string) =>
  new Promise<T | null>((resolve) => {
    if (!token) return resolve(null);
    verify(token, secret || jwtSecret, (err, payload) => {
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
export const generateAccessToken = (props: AccessTokenPayload) =>
  sign(props, jwtSecret, { expiresIn: '7d' });

export const generateAuthenticationToken = (props: AuthenticationTokenPayload) =>
  sign(props, regionJwtSecret, { expiresIn: '60000' });
