import { getInitData } from '@/api/platform';
import { Coin } from '@/constants/app';

export let SEALOS_DOMAIN = 'cloud.sealos.io';
export let SEALOS_USER_DOMAINS = [{ name: 'cloud.sealos.io', secretName: 'wildcard-cert' }];
export let DESKTOP_DOMAIN = 'cloud.sealos.io';
export let INFRASTRUCTURE_PROVIDER = 'alibaba';
export let REQUIRES_DOMAIN_REG = false;
export let DOMAIN_REG_QUERY_LINK = '';
export let DOMAIN_BINDING_DOCUMENTATION_LINK: string | null = null;
export let DOMAIN_PORT = '';
export let SHOW_EVENT_ANALYZE = false;
export let CURRENCY = Coin.shellCoin;
export let UPLOAD_LIMIT = 50;
export let DOWNLOAD_LIMIT = 100;
export let PVC_STORAGE_MAX = 20;
export let GPU_ENABLED = false;

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
    SHOW_EVENT_ANALYZE = res.SHOW_EVENT_ANALYZE;
    CURRENCY = res.CURRENCY;
    UPLOAD_LIMIT = res.fileMangerConfig.uploadLimit;
    DOWNLOAD_LIMIT = res.fileMangerConfig.downloadLimit;
    DESKTOP_DOMAIN = res.DESKTOP_DOMAIN;
    PVC_STORAGE_MAX = res.PVC_STORAGE_MAX;
    GPU_ENABLED = res.GPU_ENABLED;

    return {
      SEALOS_DOMAIN,
      DOMAIN_PORT,
      CURRENCY,
      FORM_SLIDER_LIST_CONFIG: res.FORM_SLIDER_LIST_CONFIG,
      DESKTOP_DOMAIN: res.DESKTOP_DOMAIN,
      GPU_ENABLED
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
    SHOW_EVENT_ANALYZE = global.AppConfig.launchpad.eventAnalyze.enabled;
    SEALOS_USER_DOMAINS = global.AppConfig.cloud.userDomains;
  } catch (error) {}
};
