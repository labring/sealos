import { getInitData } from '@/api/platform';

export let SEALOS_DOMAIN: string;

export const loadInitData = async () => {
  try {
    const res = await getInitData();
    SEALOS_DOMAIN = res.SEALOS_DOMAIN;

    return {
      SEALOS_DOMAIN
    };
  } catch (err) {
    console.error(err);
  }

  return {
    SEALOS_DOMAIN
  };
};
