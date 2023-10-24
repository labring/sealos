import request from '@/services/request';
import { Session } from 'sealos-desktop-sdk';
import { TUserExist } from '@/types/user';
import { ApiResp } from '@/types';
import { AxiosInstance } from 'axios';

export const _passwordExistRequest = (request: AxiosInstance) => (data: { user: string }) =>
  request.post<any, ApiResp<TUserExist>>('/api/auth/password/exist', data);
export const _passwordLoginRequest =
  (request: AxiosInstance) => (data: { user: string; password: string }) =>
    request.post<any, ApiResp<Session>>('/api/auth/password', data);
export const _passwordModifyRequest =
  (request: AxiosInstance) => (data: { oldPassword: string; newPassword: string }) =>
    request.post<any, ApiResp<{ message: string }>>('/api/auth/password/modify', data);

export const passwordExistRequest = _passwordExistRequest(request);
export const passwordLoginRequest = _passwordLoginRequest(request);
export const passwordModifyRequest = _passwordModifyRequest(request);
