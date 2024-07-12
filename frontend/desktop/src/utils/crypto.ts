import * as crypto from 'crypto';

// use sha256 to hash the password
export function hashPassword(password: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(password + global.AppConfig?.desktop.auth.idp.password?.salt || '');
  return hash.digest('hex');
}

export const verifyPassword = (password: string, hash: string): boolean =>
  hashPassword(password) === hash;
export const strongPassword = (password: string): boolean => /^(?=.*\S).{8,}$/.test(password);
export const strongUsername = (username: string): boolean => /^[a-zA-Z0-9_-]{3,16}$/.test(username);
export const isEmail = (email: string) =>
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
