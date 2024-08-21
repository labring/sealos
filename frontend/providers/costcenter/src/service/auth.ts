import { IncomingHttpHeaders } from 'http';
import { sign, verify } from 'jsonwebtoken';

const regionUID = () => global.AppConfig?.cloud.regionUID || '123456789';
const internalJwtSecret = () => global.AppConfig?.costCenter.auth.jwt.internal || '123456789';
const externalJwtSecret = () => global.AppConfig?.costCenter.auth.jwt.external || '123456789';

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

// export const verifyAccessToken = async (header: IncomingHttpHeaders) =>
//   verifyToken<AccessTokenPayload>(header).then(
//     (payload) => {
//       if (payload?.regionUid === regionUID()) {
//         return payload;
//       } else {
//         return null;
//       }
//     },
//     (err) => null
//   );
// export const verifyAuthenticationToken = async (header: IncomingHttpHeaders) => {
//   try {
//     if (!header?.authorization) {
//       throw new Error('缺少凭证');
//     }
//     const token = decodeURIComponent(header.authorization);
//     const payload = await verifyJWT<AuthenticationTokenPayload>(token, grobalJwtSecret());
//     return payload;
//   } catch (err) {
//     return null;
//   }
// };
export const verifyJWT = <T extends Object = AccessTokenPayload>(token: string, secret: string) =>
  new Promise<T | null>((resolve) => {
    if (!token) return resolve(null);
    verify(token, secret, (err, payload) => {
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

export const generateAppToken = (props: AccessTokenPayload) =>
  sign(props, internalJwtSecret(), { expiresIn: '7d' });
