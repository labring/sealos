import request from '@/services/request';
import { ApiResp } from '@/types';
import { NamespaceDto, UserRole, teamMessageDto } from '@/types/team';
import { TeamUserDto } from '@/types/user';
import { AxiosInstance } from 'axios';
import { Session } from 'sealos-desktop-sdk/*';
export const _abdicateRequest =
  (request: AxiosInstance) => (data: { ns_uid: string; targetUserCrUid: string }) =>
    request.post<any, ApiResp<null>>('/api/auth/namespace/abdicate', data);

export const _createRequest =
  (request: AxiosInstance) =>
  ({ teamName }: Record<'teamName', string>) =>
    request.post<any, ApiResp<{ namespace: NamespaceDto }>>('/api/auth/namespace/create', {
      teamName
    });

export const _deleteTeamRequest =
  (request: AxiosInstance) =>
  ({ ns_uid }: { ns_uid: string }) =>
    request.post<any, ApiResp<undefined>>('/api/auth/namespace/delete', {
      ns_uid
    });
export const _inviteMemberRequest =
  (request: AxiosInstance) => (props: { ns_uid: string; targetUserId: string; role: UserRole }) =>
    request.post<typeof props, ApiResp<null>>('/api/auth/namespace/invite', props);

export const _modifyRoleRequest =
  (request: AxiosInstance) =>
  (props: { ns_uid: string; targetUserCrUid: string; tRole: UserRole }) =>
    request.post<typeof props, ApiResp<null>>('/api/auth/namespace/modifyRole', props);

export const _nsListRequest = (request: AxiosInstance) => () =>
  request<any, ApiResp<{ namespaces: NamespaceDto[] }>>('/api/auth/namespace/list');

export enum reciveAction {
  Accepte = 'accept',
  Reject = 'reject'
}
type verifyParam = { ns_uid: string; action: reciveAction };

export const _verifyInviteRequest = (request: AxiosInstance) => (data: verifyParam) =>
  request.post<verifyParam, ApiResp<{ result: unknown }>>('/api/auth/namespace/verifyInvite', data);
export const _removeMemberRequest =
  (request: AxiosInstance) => (data: { ns_uid: string; targetUserCrUid: string }) =>
    request.post<typeof data, ApiResp<null>>('/api/auth/namespace/removeUser', data);

export const _teamDetailsRequest = (request: AxiosInstance) => (ns_uid: string) =>
  request.post<any, ApiResp<{ users: TeamUserDto[]; namespace: NamespaceDto }>>(
    '/api/auth/namespace/details',
    { ns_uid }
  );
export const _reciveMessageRequest = (request: AxiosInstance) => () =>
  request.post<any, ApiResp<{ messages: teamMessageDto[] }>>('/api/auth/namespace/recive');
export const _switchRequest = (request: AxiosInstance) => (ns_uid: string) =>
  request.post<any, ApiResp<{ token: string; kubeconfig: string }>>('/api/auth/namespace/switch', {
    ns_uid
  });
// 提供给prod/dev环境使用
export const abdicateRequest = _abdicateRequest(request);
export const createRequest = _createRequest(request);
export const deleteTeamRequest = _deleteTeamRequest(request);
export const inviteMemberRequest = _inviteMemberRequest(request);
export const modifyRoleRequest = _modifyRoleRequest(request);
export const nsListRequest = _nsListRequest(request);
export const verifyInviteRequest = _verifyInviteRequest(request);
export const removeMemberRequest = _removeMemberRequest(request);
export const teamDetailsRequest = _teamDetailsRequest(request);
export const reciveMessageRequest = _reciveMessageRequest(request);
export const switchRequest = _switchRequest(request);
