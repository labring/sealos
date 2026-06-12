import { getInitData } from '@/api/platform';
import { Coin } from '@/constants/app';
import { setPublicDomainReservedPrefixes } from '@/utils/public-domain';

export let SEALOS_DOMAIN = 'cloud.sealos.io';
export let SEALOS_USER_DOMAINS = [{ name: 'cloud.sealos.io', secretName: 'wildcard-cert' }];
export let DESKTOP_DOMAIN = 'cloud.sealos.io';
export let INFRASTRUCTURE_PROVIDER = 'alibaba';
export let REQUIRES_DOMAIN_REG = false;
export let DOMAIN_REG_QUERY_LINK = '';
export let DOMAIN_BINDING_DOCUMENTATION_LINK: string | null = null;
export let DOMAIN_PORT = '';
export let HTTP_PORT = '';
export let DISABLE_HTTPS = false;
export let SHOW_EVENT_ANALYZE = false;
export let CURRENCY = Coin.shellCoin;
export let UPLOAD_LIMIT = 50;
export let DOWNLOAD_LIMIT = 100;
export let PVC_STORAGE_MAX = 20;
export let GPU_ENABLED = false;
export let LOG_ENABLED = false;
export let NETWORK_STORAGE_ENABLED = false;
export let PUBLIC_DOMAIN_RESERVED_PREFIXES: string[] = [];

export const loadInitData = async () => {
  try {
    const res = await getInitData();

    SEALOS_DOMAIN = res.SEALOS_DOMAIN;
    SEALOS_USER_DOMAINS = res.SEALOS_USER_DOMAINS;
    INFRASTRUCTURE_PROVIDER = res.INFRASTRUCTURE_PROVIDER;
    REQUIRES_DOMAIN_REG = res.REQUIRES_DOMAIN_REG;
    DOMAIN_REG_QUERY_LINK = res.DOMAIN_REG_QUERY_LINK;
    DOMAIN_BINDING_DOCUMENTATION_LINK = res.DOMAIN_BINDING_DOCUMENTATION_LINK;
    DOMAIN_PORT = res.DOMAIN_PORT;
    HTTP_PORT = res.HTTP_PORT;
    DISABLE_HTTPS = res.DISABLE_HTTPS;
    SHOW_EVENT_ANALYZE = res.SHOW_EVENT_ANALYZE;
    CURRENCY = res.CURRENCY;
    UPLOAD_LIMIT = res.fileMangerConfig.uploadLimit;
    DOWNLOAD_LIMIT = res.fileMangerConfig.downloadLimit;
    DESKTOP_DOMAIN = res.DESKTOP_DOMAIN;
    PVC_STORAGE_MAX = res.PVC_STORAGE_MAX;
    GPU_ENABLED = res.GPU_ENABLED;
    LOG_ENABLED = res.LOG_ENABLED;
    NETWORK_STORAGE_ENABLED = res.NETWORK_STORAGE_ENABLED;
    PUBLIC_DOMAIN_RESERVED_PREFIXES = res.PUBLIC_DOMAIN_RESERVED_PREFIXES || [];
    setPublicDomainReservedPrefixes(PUBLIC_DOMAIN_RESERVED_PREFIXES);

    return {
      SEALOS_DOMAIN,
      DOMAIN_PORT,
      HTTP_PORT,
      DISABLE_HTTPS,
      CURRENCY,
      FORM_SLIDER_LIST_CONFIG: res.FORM_SLIDER_LIST_CONFIG,
      DESKTOP_DOMAIN: res.DESKTOP_DOMAIN,
      GPU_ENABLED,
      PUBLIC_DOMAIN_RESERVED_PREFIXES
    };
  } catch (error) {}

  return {
    SEALOS_DOMAIN
  };
};

// server side method
export const serverLoadInitData = () => {
  try {
    SEALOS_DOMAIN = global.AppConfig.cloud.domain || 'cloud.sealos.io';
    DOMAIN_PORT = global.AppConfig.cloud.port || '';
    HTTP_PORT = global.AppConfig.cloud.httpPort || '';
    DISABLE_HTTPS = !!global.AppConfig.cloud.disableHttps;
    SHOW_EVENT_ANALYZE = global.AppConfig.launchpad.eventAnalyze.enabled;
    SEALOS_USER_DOMAINS = global.AppConfig.cloud.userDomains;
    PUBLIC_DOMAIN_RESERVED_PREFIXES =
      global.AppConfig.launchpad.publicDomain?.reservedPrefixes || [];
    setPublicDomainReservedPrefixes(PUBLIC_DOMAIN_RESERVED_PREFIXES);
  } catch (error) {}
};
