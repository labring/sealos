export type OAuthToken = {
  readonly access_token: string;
  readonly token_type: string;
  readonly refresh_token: string;
  readonly expiry: string;
};

export type UserInfo = {
  readonly userRestrictedLevel?: number;
  readonly realName?: string;
  readonly k8s_username: string;
  readonly name: string;
  readonly avatar: string;
  readonly nsid: string;
  readonly ns_uid: string;
  readonly userUid: string;
  readonly userId: string;
  readonly userCrUid: string;
  // readonly globalUserId: string;
};

export type KubeConfig = string;

export type Session = {
  token: string; // jwt token
  // 提供一些简单的信息
  user: UserInfo;
  // 帮忙导出用的
  kubeconfig: KubeConfig;
};
export type ApiSession = {
  // 提供一些简单的信息
  user: {
    readonly kubernetesUsername: string;
    readonly name: string;
    readonly avatar: string;
    readonly nsID: string;
    readonly nsUID: string;
    readonly userID: string;
  };
  // 帮忙导出用的
  kubeconfig: KubeConfig;
};
export type JWTPayload = {
  kubeconfig: KubeConfig;
  user: Record<'uid' | 'nsid' | 'k8s_username' | 'ns_uid', string>;
};
export const sessionKey = 'session';
