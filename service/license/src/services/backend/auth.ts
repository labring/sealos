import { IncomingHttpHeaders } from 'http';
import { sign, verify } from 'jsonwebtoken';
import { JWTPayload } from '@/types';

const jwtSecret = (process.env.JWT_SECRET as string) || '123456789';

export const authSession = async (header: IncomingHttpHeaders) => {
  try {
    if (!header?.authorization) {
      throw new Error('缺少凭证');
    }
    const token = decodeURIComponent(header.authorization);
    const payload = await verifyJWT(token);
    if (!payload) {
      throw new Error('token is null');
    }
    return Promise.resolve(payload);
  } catch (err) {
    console.error(err, '===');
    return Promise.resolve(null);
  }
};

export const verifyJWT: (token: string) => Promise<JWTPayload | null> = (token: string) =>
  new Promise((resolve) => {
    verify(token, jwtSecret, (err, payload) => {
      if (err) {
        console.log(err);
        resolve(null);
      } else if (!payload) {
        console.log('payload is null');
        resolve(null);
      } else {
        resolve(payload as JWTPayload);
      }
    });
  });

export const generateJWT = (props: JWTPayload) => {
  console.log('jwt: ', props);
  return sign(props, jwtSecret, {
    expiresIn: '7d'
  });
};
