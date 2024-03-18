import request from '@/services/request';
import { Session } from 'sealos-desktop-sdk';
import { TUserExist } from '@/types/user';
import { ApiResp, Region } from '@/types';
import { AxiosHeaders, AxiosHeaderValue, type AxiosInstance } from 'axios';
import useSessionStore from '@/stores/session';

export const _getRegionToken = (request: AxiosInstance) => () =>
  request.post<any, ApiResp<{ token: string; kubeconfig: string; appToken: string }>>(
    '/api/auth/regionToken'
  );

export const getRegionToken = _getRegionToken(request);
export const _passwordExistRequest = (request: AxiosInstance) => (data: { user: string }) =>
  request.post<any, ApiResp<TUserExist>>('/api/auth/password/exist', data);
export const _passwordLoginRequest =
  (request: AxiosInstance, switchAuth: (token: string) => void) =>
  (
    data:
      | { user: string; password: string; inviterId: string | null | undefined }
      | {
          user: string;
          password: string;
        }
  ) =>
    request.post<any, ApiResp<{ token: string }>>('/api/auth/password', data).then(
      ({ data }) => {
        if (data) {
          switchAuth(data.token);
          return _getRegionToken(request)();
        } else {
          return null;
        }
      },
      (err) => Promise.resolve(null)
    );
export const _passwordModifyRequest =
  (request: AxiosInstance) => (data: { oldPassword: string; newPassword: string }) =>
    request.post<any, ApiResp<{ message: string }>>('/api/auth/password/modify', data);
export const _UserInfo = (request: AxiosInstance) => () =>
  request.post<
    any,
    ApiResp<{
      info: {
        uid: string;
        createdAt: Date;
        updatedAt: Date;
        avatarUri: string;
        nickname: string;
        id: string;
        name: string;
      };
    }>
  >('/api/auth/info');
export const _regionList = (request: AxiosInstance) => () =>
  request.get<
    any,
    ApiResp<{
      regionList: Region[];
    }>
  >('/api/auth/regionList');
export const passwordExistRequest = _passwordExistRequest(request);
export const passwordLoginRequest = _passwordLoginRequest(request, (token) => {
  useSessionStore.setState({ token: token });
});
export const passwordModifyRequest = _passwordModifyRequest(request);
export const UserInfo = _UserInfo(request);

export const regionList = _regionList(request);
