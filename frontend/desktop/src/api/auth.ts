import request from '@/services/request';
import { Session } from 'sealos-desktop-sdk';
import { TUserExist } from '@/types/user';
import { ApiResp } from '@/types';
import { AxiosInstance } from 'axios';

export const _passwordExistRequest = (request: AxiosInstance) => (user: string) =>
  request.post<any, ApiResp<TUserExist>, { user: string }>('/api/auth/password/exist', {
    user
  });
export const _passwordLoginRequest =
  (request: AxiosInstance) => (data: { user: string; password: string }) =>
    request.post<any, ApiResp<Session>>('/api/auth/password', data);

export const passwordExistRequest = _passwordExistRequest(request);
export const passwordLoginRequest = _passwordLoginRequest(request);
