import { InvitedStatus, UserRole } from './team';

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
  id: number;
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
// if default, uid
export const PROVIDERS = ['github', 'wechat', 'phone', 'uid', 'password_user', 'google'] as const;
export type Provider = (typeof PROVIDERS)[number];
export type OauthProvider = Exclude<Provider, 'uid' | 'password_user' | 'phone'>;
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
  google?: string;
  phone?: string;
  k8s_users?: K8s_user[];
  created_time: string;
  password?: string;
  password_user?: string;
};
export type UserDto = {
  uid: string;
  avatarUrl: string;
  name: string;
  k8s_username: string;
  createdTime: string;
};
export type TeamUserDto = UserDto & {
  joinTime?: Date;
  role: UserRole;
  status: InvitedStatus;
};
