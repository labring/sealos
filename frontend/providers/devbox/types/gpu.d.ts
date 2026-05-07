export type GpuAliasName = {
  zh?: string;
  en?: string;
};

export type GpuAliasConfig = {
  default?: string;
  icon?: string;
  name?: GpuAliasName;
  resource?: Record<string, string>;
};

export type GpuAliasMap = Record<string, GpuAliasConfig>;

export type GpuPodConfig = {
  annotations?: Record<string, string>;
  resources?: {
    limits?: Record<string, string>;
  };
};

export type GpuSpecType = 'GPU' | 'vGPU' | string;

export type GpuInventorySpec = {
  type: GpuSpecType;
  memory: string;
  value: string;
  stock: number;
  podConfig?: GpuPodConfig;
};

export type GpuInventoryModel = {
  model: string;
  displayName?: GpuAliasName;
  icon?: string;
  specs: GpuInventorySpec[];
};

export type GpuInventoryData = {
  updatedAt: string;
  data: GpuInventoryModel[];
};
