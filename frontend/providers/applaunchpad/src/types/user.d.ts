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

const sessionKey = 'session';

export { sessionKey };

export type userPriceType = {
  cpu: number;
  memory: number;
  storage: number;
  gpu?: { alias: string; type: string; price: number; inventory: number; vm: number }[];
};

export type UserQuoteItemType = {
  type: 'cpu' | 'memory' | 'storage' | 'gpu';
  used: number;
  limit: number;
};
