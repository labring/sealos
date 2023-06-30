import { getResourcePrice, getDBVersionMap } from '@/api/platform';
import type { Response as resourcePriceResponse } from '@/pages/api/platform/resourcePrice';
import { DBTypeEnum } from '@/constants/db';
import type { Response as DBVersionMapType } from '@/pages/api/platform/getVersion';

export let SOURCE_PRICE: resourcePriceResponse = {
  cpu: 0.067,
  memory: 0.033792,
  storage: 0.002048
};
export let INSTALL_ACCOUNT = false;

let retryGetPrice = 3;
let retryVersion = 3;

export let DBVersionMap: DBVersionMapType = {
  [DBTypeEnum.postgresql]: [],
  [DBTypeEnum.mongodb]: [],
  [DBTypeEnum.mysql]: [],
  [DBTypeEnum.redis]: []
};

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

export const getDBVersion = async () => {
  try {
    const res = await getDBVersionMap();
    DBVersionMap = res;
  } catch (err) {
    retryVersion--;
    if (retryVersion >= 0) {
      setTimeout(() => {
        getDBVersion();
      }, 1000);
    }
  }
};
