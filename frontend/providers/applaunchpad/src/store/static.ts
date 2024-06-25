import { getInitData } from '@/api/platform';
import { Coin } from '@/constants/app';

export let SEALOS_DOMAIN = 'cloud.sealos.io';
export let DOMAIN_PORT = '';
export let INGRESS_SECRET = 'wildcard-cert';
export let SHOW_EVENT_ANALYZE = false;
export let CURRENCY = Coin.shellCoin;
export let UPLOAD_LIMIT = 50;
export let DOWNLOAD_LIMIT = 100;

export const loadInitData = async () => {
  try {
    const res = await getInitData();
    SEALOS_DOMAIN = res.SEALOS_DOMAIN;
    DOMAIN_PORT = res.DOMAIN_PORT;
    INGRESS_SECRET = res.INGRESS_SECRET;
    SHOW_EVENT_ANALYZE = res.SHOW_EVENT_ANALYZE;
    CURRENCY = res.CURRENCY;
    UPLOAD_LIMIT = res.fileMangerConfig.uploadLimit;
    DOWNLOAD_LIMIT = res.fileMangerConfig.downloadLimit;

    return {
      SEALOS_DOMAIN,
      DOMAIN_PORT,
      INGRESS_SECRET,
      CURRENCY,
      FORM_SLIDER_LIST_CONFIG: res.FORM_SLIDER_LIST_CONFIG
    };
  } catch (error) {}

  return {
    SEALOS_DOMAIN,
    INGRESS_SECRET
  };
};

// server side method
export const serverLoadInitData = () => {
  try {
    SEALOS_DOMAIN = global.AppConfig.cloud.domain || 'cloud.sealos.io';
    DOMAIN_PORT = global.AppConfig.cloud.port || '';
    INGRESS_SECRET = global.AppConfig.launchpad.ingressTlsSecretName || 'wildcard-cert';
    SHOW_EVENT_ANALYZE = global.AppConfig.launchpad.eventAnalyze.enabled;
  } catch (error) {}
};
