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
  user: UserInfo;
  kubeconfig: KubeConfig;
};

export type UserQuotaItemType = {
  type: 'cpu' | 'memory' | 'storage' | 'gpu';
  used: number;
  limit: number;
};

export type UserInfoV1 = Readonly<{
  id: string;
  name: string;
  avatar: string;
  k8sUsername: string;
  nsid: string;
}>;

export type SessionV1 = {
  token?: string;
  user: UserInfoV1;
  kubeconfig: KubeConfig;
};
