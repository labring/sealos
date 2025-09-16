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
  nodeports: number;
  gpu?: { alias: string; type: string; price: number; inventory: number; vm: number }[];
};

export enum TaskType {
  APPSTORE = 'APPSTORE'
}

export type UserTask = {
  id: string;
  title: string;
  description: string;
  reward: string;
  order: number;
  taskType: TaskType;
  isCompleted: boolean;
  completedAt: string;
};
