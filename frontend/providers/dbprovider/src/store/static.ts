import { getResourcePrice } from '@/api/platform';
import type { Response as resourcePriceResponse } from '@/pages/api/platform/resourcePrice';

export let SOURCE_PRICE: resourcePriceResponse = {
  cpu: 0.067,
  memory: 0.033792,
  storage: 0.002048
};
export let INSTALL_ACCOUNT = false;

let retryGetPrice = 3;

export const getUserPrice = async () => {
  try {
    const res = await getResourcePrice();
    SOURCE_PRICE = res;
    INSTALL_ACCOUNT = true;
  } catch (err) {
    retryGetPrice--;
    if (retryGetPrice >= 0) {
      setTimeout(() => {
        getUserPrice();
      }, 1000);
    }
  }
};
