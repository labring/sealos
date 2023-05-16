import { getEnvs } from '@/api/platform';

export let SEALOS_DOMAIN = 'cloud.sealos.io';
export let INGRESS_SECRET = 'wildcart-secret';

export const getServiceEnv = async () => {
  try {
    const res = await getEnvs();
    SEALOS_DOMAIN = res.SEALOS_DOMAIN;
    INGRESS_SECRET = res.INGRESS_SECRET;
  } catch (err) {
    console.log(err);
  }
};
