export type OAuthToken = {
  readonly access_token: string;
  readonly token_type: string;
  readonly refresh_token: string;
  readonly expiry: string;
};

export type UserInfo = {
  readonly k8s_username: string;
  readonly name: string;
  readonly avatar: string;
  readonly nsid: string;
  readonly ns_uid: string;
  readonly userId: string;
};

export type KubeConfig = string;

export type Session = {
  token: string; // jwt token
  // 提供一些简单的信息
  user: UserInfo;
  // 帮忙导出用的
  kubeconfig: KubeConfig;
};

export type UserQuotaItemType = {
  type: 'cpu' | 'memory' | 'storage' | 'gpu';
  used: number;
  limit: number;
};

export type UserInfoV1 = {
  readonly id: string;
  readonly name: string;
  readonly avatar: string;
};

export type SessionV1 = {
  token?: OAuthToken;
  user: UserInfoV1;
  kubeconfig: KubeConfig;
};
