import { LicenseToken } from '@/types';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

export const hashCrypto = (text: string): string => {
  const hash = crypto.createHash('sha256');
  hash.update(text);
  return hash.digest('hex');
};

export const decodeJWT = <T = LicenseToken>(token: string): T | null => {
  try {
    const decoded = jwt.decode(token);
    return decoded as T;
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
};
