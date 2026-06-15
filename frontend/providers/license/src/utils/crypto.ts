import { LicenseToken } from '@/types';
import { decodeJwt as decodeSharedJwt } from '@sealos/shared/server/jwt';
import * as crypto from 'crypto';

export const hashCrypto = (text: string): string => {
  const hash = crypto.createHash('sha256');
  hash.update(text);
  return hash.digest('hex');
};

export const decodeJWT = <T = LicenseToken>(token: string): T | null => {
  return decodeSharedJwt(token) as T | null;
};
