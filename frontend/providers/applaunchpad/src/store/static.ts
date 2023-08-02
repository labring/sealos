import { getInitData } from '@/api/platform';

export let SEALOS_DOMAIN = 'cloud.sealos.io';
export let INGRESS_SECRET = 'wildcard-cert';

export const loadInitData = async () => {
  try {
    const res = await getInitData();
    SEALOS_DOMAIN = res.SEALOS_DOMAIN;
    INGRESS_SECRET = res.INGRESS_SECRET;

    return {
      SEALOS_DOMAIN,
      INGRESS_SECRET,
      FORM_SLIDER_LIST_CONFIG: res.FORM_SLIDER_LIST_CONFIG
    };
  } catch (error) {}
  return {
    SEALOS_DOMAIN,
    INGRESS_SECRET
  };
};
