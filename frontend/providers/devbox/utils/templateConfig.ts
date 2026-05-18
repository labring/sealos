import { customAlphabet } from 'nanoid';
import type { DevboxConfigMapType } from '@/types/devbox';

export type TemplateDefaultEnv = {
  key: string;
  value: string;
};

export type TemplateDefaults = {
  envs?: TemplateDefaultEnv[];
  configMaps?: DevboxConfigMapType[];
};

const TEMPLATE_DEFAULTS_KEY = 'templateDefaults';
const createTemplateDefaultId = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

const isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const sanitizeTemplateDefaults = (defaults?: TemplateDefaults): TemplateDefaults => {
  if (!defaults) return {};

  const envs =
    defaults.envs
      ?.filter((env) => env.key.trim())
      .map((env) => ({
        key: env.key.trim(),
        value: env.value
      })) || [];

  const configMaps =
    defaults.configMaps
      ?.filter((cm) => cm.path.trim())
      .map((cm) => ({
        id: cm.id || createTemplateDefaultId(),
        path: cm.path,
        content: cm.content
      })) || [];

  return {
    ...(envs.length ? { envs } : {}),
    ...(configMaps.length ? { configMaps } : {})
  };
};

export const splitTemplateConfig = (config: string) => {
  const parsed = JSON.parse(config);
  if (!isRecord(parsed)) {
    return {
      runtimeConfig: parsed,
      defaults: {} as TemplateDefaults
    };
  }

  const { [TEMPLATE_DEFAULTS_KEY]: rawDefaults, ...runtimeConfig } = parsed;
  return {
    runtimeConfig,
    defaults: sanitizeTemplateDefaults(rawDefaults as TemplateDefaults | undefined)
  };
};

export const getRuntimeTemplateConfig = (config: string) =>
  JSON.stringify(splitTemplateConfig(config).runtimeConfig);

export const getTemplateDefaults = (config: string): TemplateDefaults =>
  splitTemplateConfig(config).defaults;

export const mergeTemplateDefaults = (config: unknown, defaults?: TemplateDefaults) => {
  const runtimeConfig = isRecord(config) ? { ...config } : {};
  delete runtimeConfig[TEMPLATE_DEFAULTS_KEY];

  const sanitizedDefaults = sanitizeTemplateDefaults(defaults);
  if (sanitizedDefaults.envs?.length || sanitizedDefaults.configMaps?.length) {
    runtimeConfig[TEMPLATE_DEFAULTS_KEY] = sanitizedDefaults;
  }

  return runtimeConfig;
};
