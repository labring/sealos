import { POST } from '@/services/request';
import { Session } from '@/types';
import { TUserExist } from '@/types/user';

export const signInByPhone = (phoneNumbers: string, code: string) =>
  POST<Session>('/api/auth/phone/verify', {
    phoneNumbers: phoneNumbers,
    code: code
  });

export const signInByPassword = (username: string, password: string) =>
  POST<Session>('/api/auth/password', {
    user: username,
    password: password
  });

export const signInByProvider = (provider: string, code: string | string[]) =>
  POST<Session>(`/api/auth/oauth/${provider}`, {
    code
  });

export const sendCodeByPhone = (phoneNumbers: string) =>
  POST('/api/auth/phone/sms', {
    phoneNumbers: phoneNumbers
  });

export const userExistsByPassword = (username: string) =>
  POST<TUserExist>('/api/auth/password/exist', {
    user: username
  });
