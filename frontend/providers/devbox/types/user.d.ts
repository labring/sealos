import type { GpuPodConfig, GpuSpecType } from './gpu';

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
  nodeports: number;
  gpu?: {
    model?: string;
    displayName?: {
      zh?: string;
      en?: string;
    };
    specType?: GpuSpecType;
    specValue?: string;
    specMemory?: string;
    stock?: number;
    podConfig?: GpuPodConfig;
    annotationType: string;
    price: number;
    available?: number;
    count?: number;
    vm?: number;
    icon?: string;
    name?: {
      zh?: string;
      en?: string;
    };
    resource?: Record<string, string>;
    nodes?: string[];
  }[];
};

export type UserQuotaItemType = {
  type: 'cpu' | 'memory' | 'storage' | 'nodeports' | 'gpu';
  used: number;
  limit: number;
};
export type GpuType = {
  manufacturers: string;
  type: string;
  amount: number;
  model?: string;
  specType?: GpuSpecType;
  specValue?: string;
  specMemory?: string;
  stock?: number;
  podConfig?: GpuPodConfig;
  resource?: Record<string, string>;
};

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
