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

export type KubeConfig = {
  readonly id: string;
  readonly name: string;
  readonly avatar: string;
};

export type Session = {
  readonly token: OAuthToken;
  readonly user: UserInfo;
  kubeconfig: string | KubeConfig;
};
