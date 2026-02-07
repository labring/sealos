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
