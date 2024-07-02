import { IncomingHttpHeaders } from 'http';
import { sign, verify } from 'jsonwebtoken';
import { JWTPayload } from '@/types';
import { AuthenticationTokenPayload, AccessTokenPayload, CronJobTokenPayload } from '@/types/token';

const regionUID = () => global.AppConfig?.cloud.regionUID || '123456789';
const grobalJwtSecret = () => global.AppConfig?.desktop.auth.jwt.global || '123456789';
const regionalJwtSecret = () => global.AppConfig?.desktop.auth.jwt.regional || '123456789';
const internalJwtSecret = () => global.AppConfig?.desktop.auth.jwt.internal || '123456789';

const verifyToken = async <T extends Object>(header: IncomingHttpHeaders) => {
  try {
    if (!header?.authorization) {
      throw new Error('缺少凭证');
    }
    const token = decodeURIComponent(header.authorization);
    const payload = await verifyJWT<T>(token);
    return payload;
  } catch (err) {
    return null;
  }
};
export const verifyAccessToken = async (header: IncomingHttpHeaders) =>
  verifyToken<AccessTokenPayload>(header).then(
    (payload) => {
      if (payload?.regionUid === regionUID()) {
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
    const payload = await verifyJWT<AuthenticationTokenPayload>(token, grobalJwtSecret());
    return payload;
  } catch (err) {
    return null;
  }
};
export const verifyJWT = <T extends Object = JWTPayload>(token?: string, secret?: string) =>
  new Promise<T | null>((resolve) => {
    if (!token) return resolve(null);
    verify(token, secret || regionalJwtSecret(), (err, payload) => {
      if (err) {
        // console.log(err);
        resolve(null);
      } else if (!payload) {
        resolve(null);
      } else {
        resolve(payload as T);
      }
    });
  });
export const generateAccessToken = (props: AccessTokenPayload) =>
  sign(props, regionalJwtSecret(), { expiresIn: '7d' });
export const generateAppToken = (props: AccessTokenPayload) =>
  sign(props, internalJwtSecret(), { expiresIn: '7d' });
export const generateAuthenticationToken = (props: AuthenticationTokenPayload) =>
  sign(props, grobalJwtSecret(), { expiresIn: '60000' });

export const generateCronJobToken = (props: CronJobTokenPayload) =>
  sign(props, internalJwtSecret(), { expiresIn: '60000' });
