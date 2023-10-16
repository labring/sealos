import { POST } from '@/services/request';
import { Session } from '@/types';
import { TUserExist } from '@/types/user';

export const signInByPhone = (phoneNumbers: string, code: string) =>
  POST<Session>('/api/auth/phone/verify', {
    phoneNumbers: phoneNumbers,
    code: code
  });

export const sendCodeByPhone = (phoneNumbers: string) =>
  POST('/api/auth/phone/sms', {
    phoneNumbers: phoneNumbers
  });

export const userExistsByPassword = (username: string) =>
  POST<TUserExist>('/api/auth/password/exist', {
    user: username
  });
