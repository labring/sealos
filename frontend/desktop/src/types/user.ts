import { _ACCOUNT_STATUS, RESPONSE_MESSAGE } from './response/utils';
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
