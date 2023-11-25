import { getResourcePrice, getDBVersionMap, getAppEnv } from '@/api/platform';
import type { Response as resourcePriceResponse } from '@/pages/api/platform/resourcePrice';
import { DBTypeEnum } from '@/constants/db';
import type { Response as DBVersionMapType } from '@/pages/api/platform/getVersion';

export let SOURCE_PRICE: resourcePriceResponse = {
  cpu: 0.067,
  memory: 0.033792,
  storage: 0.002048
};
export let StorageClassName: string | undefined;
export let Domain: string | undefined;
export let INSTALL_ACCOUNT = false;

let retryGetPrice = 3;
let retryVersion = 3;
let retryGetEnv = 3;
export let DBVersionMap: DBVersionMapType = {
  [DBTypeEnum.postgresql]: [{ id: 'postgresql-14.8.0', label: 'postgresql-14.8.0' }],
  [DBTypeEnum.mongodb]: [{ id: 'mongodb-5.0', label: 'mongodb-5.0' }],
  [DBTypeEnum.mysql]: [{ id: 'ac-mysql-8.0.30', label: 'ac-mysql-8.0.30' }],
  [DBTypeEnum.redis]: [{ id: 'redis-7.0.6', label: 'redis-7.0.6' }],
  [DBTypeEnum.kafka]: [{ id: 'kafka-3.3.2', label: 'kafka-3.3.2' }],
  [DBTypeEnum.qdrant]: [{ id: 'qdrant-1.1.0', label: 'qdrant-1.1.0' }],
  [DBTypeEnum.nebula]: [{ id: 'nebula-v3.5.0', label: 'nebula-v3.5.0' }],
  [DBTypeEnum.weaviate]: [{ id: 'weaviate-1.18.0', label: 'weaviate-1.18.0' }]
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
export const getEnv = async () => {
  try {
    const res = await getAppEnv();
    StorageClassName = res.env_storage_className;
    Domain = res.domain;
  } catch {
    retryGetEnv--;
    if (retryGetEnv >= 0) {
      setTimeout(() => {
        getEnv();
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
