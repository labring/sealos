import request from '@/services/request';
import { OauthProvider, TUserExist } from '@/types/user';
import { ApiResp, Region } from '@/types';
import { AxiosHeaders, AxiosHeaderValue, type AxiosInstance } from 'axios';
import useSessionStore from '@/stores/session';
import { ProviderType } from 'prisma/global/generated/client';
import { ValueOf } from '@/types/tools';
import { SmsType } from '@/services/backend/db/verifyCode';
import { USER_MERGE_STATUS } from '@/types/response/merge';
import { BIND_STATUS } from '@/types/response/bind';
import { UNBIND_STATUS } from '@/types/response/unbind';
import { RESOURCE_STATUS } from '@/types/response/checkResource';

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
        realName?: string;
        userRestrictedLevel?: number;
        uid: string;
        createdAt: Date;
        updatedAt: Date;
        avatarUri: string;
        nickname: string;
        id: string;
        name: string;
        oauthProvider: { providerId: string; providerType: Exclude<ProviderType, 'WECHAT_OPEN'> }[];
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
const _getSmsBindCodeRequest =
  (request: AxiosInstance) => (smsType: SmsType) => (data: { id: string; cfToken?: string }) =>
    request.post<typeof data, ApiResp>(`/api/auth/${smsType}/bind/sms`, data);

export const _verifySmsBindRequest =
  (request: AxiosInstance) => (smsType: SmsType) => (data: { id: string; code: string }) =>
    request.post<
      typeof data,
      ApiResp<{ code: string | null | undefined }, ValueOf<typeof BIND_STATUS>>
    >(`/api/auth/${smsType}/bind/verify`, data);
export const _verifySmsUnbindRequest =
  (request: AxiosInstance) => (smsType: SmsType) => (data: { id: string; code: string }) =>
    request.post<typeof data, ApiResp>(`/api/auth/${smsType}/unbind/verify`, data);
export const _getSmsUnbindCodeRequest =
  (request: AxiosInstance) => (smsType: SmsType) => (data: { id: string; cfToken?: string }) =>
    request.post<typeof data, ApiResp>(`/api/auth/${smsType}/unbind/sms`, data);
export const _verifyOldSmsRequest =
  (request: AxiosInstance) => (smsType: SmsType) => (data: { id: string; code: string }) =>
    request.post<typeof data, ApiResp<{ uid: string }>>(
      `/api/auth/${smsType}/changeBinding/verifyOld`,
      data
    );
export const _getOldSmsCodeRequest =
  (request: AxiosInstance) => (smsType: SmsType) => (data: { id: string; cfToken?: string }) =>
    request.post<typeof data, ApiResp>(`/api/auth/${smsType}/changeBinding/oldSms`, data);
export const _verifyNewSmsRequest =
  (request: AxiosInstance) =>
  (smsType: SmsType) =>
  (data: { id: string; code: string; uid: string }) =>
    request.post<typeof data, ApiResp>(`/api/auth/${smsType}/changeBinding/verifyNew`, data);
export const _getNewSmsCodeRequest =
  (request: AxiosInstance) =>
  (smsType: SmsType) =>
  (data: { id: string; cfToken?: string; uid: string }) =>
    request.post<typeof data, ApiResp>(`/api/auth/${smsType}/changeBinding/newSms`, data);

export const _oauthProviderSignIn =
  (request: AxiosInstance) =>
  (provider: ProviderType) =>
  (data: { code: string; inviterId?: string }) =>
    request.post<
      typeof data,
      ApiResp<{
        token: string;
        realUser: {
          realUserUid: string;
        };
      }>
    >(`/api/auth/oauth/${provider.toLocaleLowerCase()}`, data);
export const _oauthProviderBind =
  (request: AxiosInstance) =>
  (provider: ProviderType) =>
  (data: { code: string; inviterId?: string }) =>
    request.post<
      typeof data,
      ApiResp<{ code: string | null | undefined }, ValueOf<typeof BIND_STATUS>>
    >(`/api/auth/oauth/${provider.toLocaleLowerCase()}/bind`, data);
export const _oauthProviderUnbind =
  (request: AxiosInstance) =>
  (provider: ProviderType) =>
  (data: { code: string; inviterId?: string }) =>
    request.post<typeof data, ApiResp<{ code: string | null | undefined }, ValueOf<UNBIND_STATUS>>>(
      `/api/auth/oauth/${provider.toLocaleLowerCase()}/unbind`,
      data
    );

export const _mergeUser =
  (request: AxiosInstance) => (data: { code: string; providerType: ProviderType }) =>
    request.post<any, ApiResp<USER_MERGE_STATUS>>('/api/auth/mergeUser', data);

export const _deleteUser = (request: AxiosInstance) => () =>
  request<never, ApiResp<RESOURCE_STATUS>>('/api/auth/delete');

export const _realNameAuthRequest =
  (request: AxiosInstance) => (data: { name: string; phone?: string; idCard: string }) =>
    request.post<any, ApiResp<{ name: string }>>('/api/account/realNameAuth', data);

export const passwordExistRequest = _passwordExistRequest(request);
export const passwordLoginRequest = _passwordLoginRequest(request, (token) => {
  useSessionStore.setState({ token });
});
export const passwordModifyRequest = _passwordModifyRequest(request);
export const UserInfo = _UserInfo(request);
export const regionList = _regionList(request);

export const getSmsBindCodeRequest = _getSmsBindCodeRequest(request);
export const verifySmsBindRequest = _verifySmsBindRequest(request);
export const getSmsUnbindCodeRequest = _getSmsUnbindCodeRequest(request);
export const verifySmsUnbindRequest = _verifySmsUnbindRequest(request);
export const getOldSmsCodeRequest = _getOldSmsCodeRequest(request);
export const verifyOldSmsRequest = _verifyOldSmsRequest(request);
export const getNewSmsCodeRequest = _getNewSmsCodeRequest(request);
export const verifyNewSmsRequest = _verifyNewSmsRequest(request);
export const bindRequest = _oauthProviderBind(request);
export const unBindRequest = _oauthProviderUnbind(request);
export const signInRequest = _oauthProviderSignIn(request);
export const mergeUserRequest = _mergeUser(request);
export const deleteUserRequest = _deleteUser(request);

export const realNameAuthRequest = _realNameAuthRequest(request);
