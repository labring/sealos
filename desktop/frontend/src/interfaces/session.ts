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

// TODO: 这里的类型定义有问题，需要修复
export type KubeConfig = {
  readonly id: string;
  readonly name: string;
  readonly avatar: string;
};

export type Session = {
  token: OAuthToken;
  user: UserInfo;
  kubeconfig: string;
};

const sessionKey = 'session';

export { sessionKey };
