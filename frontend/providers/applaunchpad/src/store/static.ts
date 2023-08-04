import { getInitData } from '@/api/platform';

export let SEALOS_DOMAIN = 'cloud.sealos.io';
export let DOMAIN_PORT = '';
export let INGRESS_SECRET = 'wildcard-cert';
export let SHOW_EVENT_ANALYZE = false;

export const loadInitData = async () => {
  try {
    const res = await getInitData();
    SEALOS_DOMAIN = res.SEALOS_DOMAIN;
    DOMAIN_PORT = res.DOMAIN_PORT;
    INGRESS_SECRET = res.INGRESS_SECRET;
    SHOW_EVENT_ANALYZE = res.SHOW_EVENT_ANALYZE;

    return {
      SEALOS_DOMAIN,
      DOMAIN_PORT,
      INGRESS_SECRET,
      FORM_SLIDER_LIST_CONFIG: res.FORM_SLIDER_LIST_CONFIG
    };
  } catch (error) {}
  return {
    SEALOS_DOMAIN,
    INGRESS_SECRET
  };
};
