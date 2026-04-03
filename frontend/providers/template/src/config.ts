import { AppConfig, AppConfigSchema, CustomScript } from './types/config';

const parseBooleanEnv = (value: string | undefined, defaultValue = false) => {
  if (value === undefined) return defaultValue;
  return value === 'true';
};

const parseNumberEnv = (value: string | undefined, defaultValue: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

const parseCustomScripts = (value: string | undefined): CustomScript[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[App Config] Failed to parse CUSTOM_SCRIPTS from env:', error);
    return [];
  }
};

function buildConfigFromEnv(): Readonly<AppConfig> {
  const cloudDomain = process.env.SEALOS_CLOUD_DOMAIN || 'cloud.sealos.io';
  const desktopDomain = process.env.DESKTOP_DOMAIN || cloudDomain;
  const currencySymbolType =
    process.env.CURRENCY_SYMBOL === 'cny' || process.env.CURRENCY_SYMBOL === 'usd'
      ? process.env.CURRENCY_SYMBOL
      : 'shellCoin';

  return AppConfigSchema.parse({
    cloud: {
      domain: cloudDomain,
      port: parseNumberEnv(process.env.SEALOS_CLOUD_PORT, 443),
      regionUid: '',
      certSecretName: process.env.SEALOS_CERT_SECRET_NAME || 'wildcard-cert'
    },
    template: {
      ui: {
        brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Sealos',
        forcedLanguage: process.env.FORCED_LANGUAGE || 'en',
        currencySymbolType,
        meta: {
          canonicalUrl: process.env.NEXT_PUBLIC_CANONICAL_URL || `https://template.${cloudDomain}`,
          customScripts: parseCustomScripts(process.env.CUSTOM_SCRIPTS)
        },
        carousel: {
          enabled: false,
          slides: []
        }
      },
      repo: {
        url: process.env.TEMPLATE_REPO_URL || 'https://github.com/labring-actions/templates',
        branch: process.env.TEMPLATE_REPO_BRANCH || 'main',
        localDir: process.env.TEMPLATE_REPO_FOLDER || 'template'
      },
      features: {
        fetchReadme: parseBooleanEnv(process.env.ENABLE_README_FETCH),
        showAuthor: parseBooleanEnv(process.env.SHOW_AUTHOR),
        guide: parseBooleanEnv(process.env.GUIDE_ENABLED)
      },
      cdnHost: process.env.CDN_URL,
      excludedCategories: process.env.BLACKLIST_CATEGORIES
        ? process.env.BLACKLIST_CATEGORIES.split(',').filter(Boolean)
        : [],
      sidebarMenuCount: parseNumberEnv(process.env.SIDEBAR_MENU_COUNT, 10),
      desktopDomain,
      userDomain: process.env.SEALOS_USER_DOMAIN || undefined,
      billingUrl: process.env.BILLING_URL || ''
    }
  });
}

/**
 * Get the global application configuration.
 * Should only use on server side.
 */
export function Config(): Readonly<AppConfig> {
  if (typeof window !== 'undefined') {
    throw new Error('[App Config] App config should only exists on server side.');
  }

  const cfg = globalThis.__APP_CONFIG__;
  if (!cfg) {
    console.warn('[App Config] config not initialized, falling back to environment variables.');
    return buildConfigFromEnv();
  }

  return cfg;
}
