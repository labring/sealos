import { existsSync, readFileSync } from 'fs';
import JsYaml from 'js-yaml';

export type TemplateCategory = {
  slug: string;
  i18n: Record<string, string>;
};

export type RuntimeAppConfig = {
  cloud?: {
    domain?: string;
    port?: number | string;
    httpPort?: number | string;
    disableHttps?: boolean | string;
    certSecretName?: string;
  };
  template?: {
    ui?: {
      brandName?: string;
      forcedLanguage?: string;
      currencySymbol?: string;
      currencySymbolType?: string;
      carousel?: {
        enabled?: boolean;
        slides?: unknown[];
      };
    };
    repo?: {
      url?: string;
      branch?: string;
      localDir?: string;
    };
    features?: {
      showAuthor?: boolean;
      fetchReadme?: boolean;
      guide?: boolean;
    };
    categories?: TemplateCategory[];
    desktopDomain?: string;
    userDomain?: string;
    billingUrl?: string;
  };
};

export const DEFAULT_TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { slug: 'ai', i18n: { en: 'AI', zh: 'AI' } },
  { slug: 'backend', i18n: { en: 'Backend', zh: '后端' } },
  { slug: 'blog', i18n: { en: 'Blog', zh: '博客' } },
  { slug: 'database', i18n: { en: 'Database', zh: '数据库' } },
  { slug: 'dev-ops', i18n: { en: 'DevOps', zh: '运维' } },
  { slug: 'frontend', i18n: { en: 'Frontend', zh: '前端' } },
  { slug: 'game', i18n: { en: 'Games', zh: '游戏' } },
  { slug: 'low-code', i18n: { en: 'Low-Code', zh: '低代码' } },
  { slug: 'monitor', i18n: { en: 'Monitoring', zh: '监控' } },
  { slug: 'storage', i18n: { en: 'Storage', zh: '存储' } },
  { slug: 'tool', i18n: { en: 'Tools', zh: '工具' } }
];

const CONFIG_PATHS = ['/app/data/config.yaml', '/config.yaml'] as const;

export function readRuntimeAppConfig(): RuntimeAppConfig {
  for (const configPath of CONFIG_PATHS) {
    try {
      if (!existsSync(configPath)) continue;
      return (JsYaml.load(readFileSync(configPath, 'utf-8')) || {}) as RuntimeAppConfig;
    } catch (error) {
      console.log(`[App Config] Failed to read runtime config from ${configPath}:`, error);
    }
  }

  return {};
}

export function getRuntimeCurrencySymbol(value?: string): 'shellCoin' | 'cny' | 'usd' {
  if (value === 'cny' || value === 'usd') return value;
  return 'shellCoin';
}

export function getRuntimeCategories(value?: unknown): TemplateCategory[] {
  if (!Array.isArray(value)) return DEFAULT_TEMPLATE_CATEGORIES;

  const categories = value.filter(
    (category): category is TemplateCategory =>
      typeof category?.slug === 'string' &&
      !!category.slug &&
      typeof category?.i18n === 'object' &&
      category.i18n !== null
  );

  return categories;
}

export function getConfiguredCategories(
  config: RuntimeAppConfig = readRuntimeAppConfig()
): TemplateCategory[] {
  if (config.template?.categories !== undefined) {
    return getRuntimeCategories(config.template.categories);
  }

  const value = process.env.TEMPLATE_CATEGORIES;
  if (!value) return DEFAULT_TEMPLATE_CATEGORIES;

  try {
    return getRuntimeCategories(JSON.parse(value));
  } catch (error) {
    console.error('[Template Categories] Failed to parse TEMPLATE_CATEGORIES:', error);
    return DEFAULT_TEMPLATE_CATEGORIES;
  }
}

export function getRuntimeCloudDomain(config: RuntimeAppConfig = readRuntimeAppConfig()) {
  return (
    process.env.SEALOS_USER_DOMAIN ||
    config.template?.userDomain ||
    config.cloud?.domain ||
    process.env.SEALOS_CLOUD_DOMAIN ||
    'cloud.sealos.io'
  );
}

export function getRuntimeDesktopDomain(config: RuntimeAppConfig = readRuntimeAppConfig()) {
  return (
    config.template?.desktopDomain || process.env.DESKTOP_DOMAIN || getRuntimeCloudDomain(config)
  );
}

export function getRuntimeCloudPort(config: RuntimeAppConfig = readRuntimeAppConfig()) {
  return process.env.SEALOS_CLOUD_PORT || String(config.cloud?.port || '');
}

export function getRuntimeHttpPort(config: RuntimeAppConfig = readRuntimeAppConfig()) {
  return process.env.SEALOS_HTTP_PORT || String(config.cloud?.httpPort || '');
}

export function getRuntimeDisableHttps(config: RuntimeAppConfig = readRuntimeAppConfig()) {
  const value = process.env.SEALOS_DISABLE_HTTPS;
  if (value !== undefined && value !== '') return value === 'true';
  return config.cloud?.disableHttps === true || config.cloud?.disableHttps === 'true';
}

function setRuntimeEnv(name: string, value: boolean | number | string | undefined) {
  if (value === undefined || value === '') return;
  if (process.env[name] !== undefined && process.env[name] !== '') return;

  process.env[name] = String(value);
}

export function applyRuntimeAppConfigEnv() {
  const config = readRuntimeAppConfig();
  const cloud = config.cloud;
  const template = config.template;

  setRuntimeEnv('SEALOS_CLOUD_DOMAIN', cloud?.domain);
  setRuntimeEnv('SEALOS_CLOUD_PORT', cloud?.port);
  setRuntimeEnv('SEALOS_HTTP_PORT', cloud?.httpPort);
  setRuntimeEnv('SEALOS_DISABLE_HTTPS', cloud?.disableHttps);
  setRuntimeEnv('SEALOS_CERT_SECRET_NAME', cloud?.certSecretName);
  setRuntimeEnv('SEALOS_USER_DOMAIN', template?.userDomain);
  setRuntimeEnv('TEMPLATE_REPO_URL', template?.repo?.url);
  setRuntimeEnv('TEMPLATE_REPO_BRANCH', template?.repo?.branch);
  setRuntimeEnv('TEMPLATE_REPO_FOLDER', template?.repo?.localDir);
  setRuntimeEnv('SHOW_AUTHOR', template?.features?.showAuthor);
  setRuntimeEnv('DESKTOP_DOMAIN', template?.desktopDomain);
  setRuntimeEnv(
    'CURRENCY_SYMBOL',
    template?.ui?.currencySymbol || template?.ui?.currencySymbolType
  );
  setRuntimeEnv('FORCED_LANGUAGE', template?.ui?.forcedLanguage);
  setRuntimeEnv('ENABLE_README_FETCH', template?.features?.fetchReadme);
  setRuntimeEnv('GUIDE_ENABLED', template?.features?.guide);
  setRuntimeEnv('BILLING_URL', template?.billingUrl);
}
