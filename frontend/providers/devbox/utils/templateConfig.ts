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

  const configMapIdByPath = new Map<string, string>();
  const usedConfigMapIds = new Set<string>();
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
      .map((cm) => {
        const normalizedPath = cm.path.trim();
        const id =
          configMapIdByPath.get(normalizedPath) ||
          (() => {
            let nextId = cm.id || createTemplateDefaultId();
            while (usedConfigMapIds.has(nextId)) {
              nextId = createTemplateDefaultId();
            }
            configMapIdByPath.set(normalizedPath, nextId);
            usedConfigMapIds.add(nextId);
            return nextId;
          })();

        return {
          id,
          path: normalizedPath,
          content: cm.content
        };
      }) || [];

  return {
    ...(envs.length ? { envs } : {}),
    ...(configMaps.length ? { configMaps } : {})
  };
};

export const normalizeTemplateRuntimeConfig = (config: unknown) => {
  const runtimeConfig = isRecord(config) ? { ...config } : {};
  delete runtimeConfig[TEMPLATE_DEFAULTS_KEY];
  delete runtimeConfig.env;
  delete runtimeConfig.volumes;
  delete runtimeConfig.volumeMounts;

  if (Array.isArray(runtimeConfig.appPorts)) {
    runtimeConfig.appPorts = runtimeConfig.appPorts.map((appPort: Record<string, any>) => {
      if (!isRecord(appPort)) return appPort;
      return {
        ...appPort,
        name: `port-${appPort.port}`
      };
    });
  }

  return runtimeConfig;
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
  const runtimeConfig = normalizeTemplateRuntimeConfig(config);

  const sanitizedDefaults = sanitizeTemplateDefaults(defaults);
  if (sanitizedDefaults.envs?.length || sanitizedDefaults.configMaps?.length) {
    runtimeConfig[TEMPLATE_DEFAULTS_KEY] = sanitizedDefaults;
  }

  return runtimeConfig;
};
