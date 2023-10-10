export type OAuthToken = {
  readonly access_token: string;
  readonly token_type: string;
  readonly refresh_token: string;
  readonly expiry: string;
};

export type UserInfo = {
  readonly id: string;
  readonly name: string;
  readonly avatar: string;
};

export type KubeConfig = string;

export type Session = {
  token?: OAuthToken;
  user: UserInfo;
  kubeconfig: KubeConfig;
};

export const sessionKey = 'session';

export type userPriceType = {
  cpu: number;
  memory: number;
  storage: number;
  gpu?: { alias: string; type: string; price: number; inventory: number; vm: number }[];
};

export type UserQuotaItemType = {
  type: 'cpu' | 'memory' | 'storage';
  used: number;
  limit: number;
};
