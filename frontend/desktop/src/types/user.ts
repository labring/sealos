import { RESPONSE_MESSAGE } from './response/utils';
import { InvitedStatus, UserRole } from './team';
import { ProviderType } from 'prisma/global/generated/client';
export type TgithubToken = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
  token_type: 'bearer';
  scope: string;
};

export type TWechatToken = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  openid: string;
  scope: string;
  is_snapshotuser: 1;
  unionid: string;
};
export type TWechatUser = {
  openid: string;
  nickname: string;
  sex: number;
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  privilege: string[];
  unionid: string;
};
export type TgithubUser = {
  login: string;
  id?: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: 'User';
  site_admin: false;
  name: string;
  company: string;
  blog: string;
  location: string;
  email: string;
  hireable: string;
  bio: string;
  twitter_username: string;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
};
export type TgoogleUser = {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  at_hash: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  locale: string;
  iat: number;
  exp: number;
};
// if default, uid
export const PROVIDERS = [
  'GITHUB',
  'WECHAT',
  'PHONE',
  'PASSWORD',
  'GOOGLE',
  'WECHAT_OPEN',
  'OAUTH2',
  'EMAIL'
] as const;
export type OauthProvider = Exclude<ProviderType, 'PASSWORD' | 'PHONE' | 'EMAIL'>;
export type TUserExist = { user: string; exist: boolean };

export type K8s_user = {
  name: string;
};
export type User = {
  uid: string;
  avatar_url: string;
  name: string;
  github?: string;
  wechat?: string;
  wechat_open?: string;
  google?: string;
  phone?: string;
  k8s_users?: K8s_user[];
  created_time: string;
  password?: string;
  password_user?: string;
};
export type UserDto = {
  uid: string;
  crUid: string;
  avatarUrl: string;
  nickname: string;
  k8s_username: string;
  createdTime: string;
};
export type TeamUserDto = UserDto & {
  joinTime?: Date;
  role: UserRole;
  status: InvitedStatus;
};

export type AccountCRD = {
  apiVersion: string;
  kind: string;
  metadata: {
    annotations: Record<string, string>;
    creationTimestamp: string;
    generation: number;
  };
  status: {
    activityBonus: number;
    balance: number;
    deductionBalance: number;
    encryptBalance: string;
    encryptDeductionBalance: string;
  };
};

export type OAuth2Type = {
  access_token: string;
  token_type: string;
  expires_in: 3599;
  refresh_token: string;
  scope: string;
};
export type OAuth2UserInfoType = {
  sub: string;
  birthdate: string | null;
  family_name: string | null;
  gender: 'M' | 'F' | 'U';
  given_name: string | null;
  locale: string | null;
  middle_name: string | null;
  name: string | null;
  nickname: string | null;
  picture: string;
  preferred_username: string | null;
  profile: string | null;
  updated_at: string;
  website: string | null;
  zoneinfo: string | null;
};
enum _ACCOUNT_STATUS {
  INSUFFICENT_BALANCE = 'INSUFFICENT_BALANCE'
}
enum _RESOURCE_STATUS {
  USER_CR_NOT_FOUND = 'USER_CR_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  OAUTHPROVIDER_NOT_FOUND = 'OAUTHPROVIDER_NOT_FOUND',
  PRIVATE_WORKSPACE_NOT_FOUND = 'PRIVATE_WORKSPACE_NOT_FOUND',
  GET_RESOURCE_ERROR = 'GET_RESOURCE_ERROR',
  REMAIN_OTHER_REGION_RESOURCE = 'REMAIN_OTHER_REGION_RESOURCE',
  REMAIN_WORKSACE_OWNER = 'REMAIN_WORKSACE_OWNER',
  REMAIN_CVM = 'REMAIN_CVM',
  REMAIN_APP = 'REMAIN_APP',
  REMAIN_TEMPLATE = 'REMAIN_TEMPLATE',
  REMAIN_OBJECT_STORAGE = 'REMAIN_OBJECT_STORAGE',
  REMAIN_DATABASE = 'REMAIN_DATABASE',
  KUBECONFIG_NOT_FOUND = 'KUBECONFIG_NOT_FOUND'
}
export enum PROVIDER_STATUS {
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  PROVIDER_EXIST = 'PROVIDER_EXIST'
}
export const RESOURCE_STATUS = Object.assign(
  {},
  _RESOURCE_STATUS,
  RESPONSE_MESSAGE,
  _ACCOUNT_STATUS
);
export enum MERGE_USER_READY {
  MERGE_USER_CONTINUE = 'USER_MERGE',
  MERGE_USER_PROVIDER_CONFLICT = 'PROVIDER_CONFLICT'
}
enum _BIND_STATUS {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  NOT_SUPPORT = 'NOT_SUPPORT',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  DB_ERROR = 'DB_ERROR'
}
export const BIND_STATUS = Object.assign(
  {},
  MERGE_USER_READY,
  _BIND_STATUS,
  RESPONSE_MESSAGE,
  PROVIDER_STATUS
);
enum _UNBIND_STATUS {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  NOT_SUPPORT = 'NOT_SUPPORT',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  DB_ERROR = 'DB_ERROR'
}
export const UNBIND_STATUS = Object.assign({}, _UNBIND_STATUS, RESPONSE_MESSAGE, PROVIDER_STATUS);
enum _CHANGE_BIND_STATUS {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  NOT_SUPPORT = 'NOT_SUPPORT',
  // OLD_PROVIDER_NOT_EXIST = 'PROVIDER_NOT_EXIST',
  // NEW_PROVIDER_USED_CONFLICT = 'NEW_PROVIDER_USED_CONFLICT',
  // NEW_PROVIDER_USED_MERGE = 'NEW_PROVIDER_USED_MERGE',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  DB_ERROR = 'DB_ERROR'
}
export const CHANGE_BIND_STATUS = Object.assign(
  Object.assign(
    {},
    _CHANGE_BIND_STATUS,
    MERGE_USER_READY,
    RESPONSE_MESSAGE
    // PROVIDER_STATUSD
  ),
  PROVIDER_STATUS
);

enum _USER_MERGE_STATUS {
  NOT_SUPPORT = 'NOT_SUPPORT',
  OAUTH_PROVIDER_NOT_FOUND = 'OAUTH_PROVIDER_NOT_FOUND',
  EXIST_SAME_OAUTH_PROVIDER = 'EXIST_SAME_OAUTH_PROVIDER',
  USER_NOT_FOUND = 'USER_NOT_FOUND'
}
export const USER_MERGE_STATUS = Object.assign(
  {},
  _USER_MERGE_STATUS,
  RESPONSE_MESSAGE,
  _ACCOUNT_STATUS
);
