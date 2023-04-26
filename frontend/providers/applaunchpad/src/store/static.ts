import { getEnvs } from '@/api/platform';

export let SEALOS_DOMAIN = 'cloud.sealos.io';

export const getServiceEnv = async () => {
  try {
    const res = await getEnvs();
    SEALOS_DOMAIN = res.SEALOS_DOMAIN;
  } catch (err) {
    console.log(err);
  }
};
