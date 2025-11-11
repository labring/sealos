import { getDBVersionMap, getResourcePrice } from '@/api/platform';
import { DBTypeEnum } from '@/constants/db';
import type { Response as DBVersionMapType } from '@/pages/api/platform/getVersion';
import type { Response as resourcePriceResponse } from '@/pages/api/platform/resourcePrice';

export let SOURCE_PRICE: resourcePriceResponse = {
  cpu: 0.067,
  memory: 0.033792,
  storage: 0.002048,
  nodeports: 0.5
};

export let INSTALL_ACCOUNT = false;

let retryGetPrice = 3;
let retryVersion = 3;
let retryGetEnv = 3;
export let DBVersionMap: DBVersionMapType = {
  [DBTypeEnum.postgresql]: [
    { id: 'postgresql-16.4.0', label: 'postgresql-16.4.0' },
    { id: 'postgresql-15.7.0', label: 'postgresql-15.7.0' },
    { id: 'postgresql-15.5.0', label: 'postgresql-15.5.0' },
    { id: 'postgresql-14.8.0', label: 'postgresql-14.8.0' },
    { id: 'postgresql-14.7.2', label: 'postgresql-14.7.2' },
    { id: 'postgresql-12.15.0', label: 'postgresql-12.15.0' },
    { id: 'postgresql-12.14.1', label: 'postgresql-12.14.1' },
    { id: 'postgresql-12.14.0', label: 'postgresql-12.14.0' }
  ],
  [DBTypeEnum.mongodb]: [
    { id: 'mongodb-8.0.4', label: 'mongodb-8.0.4' },
    { id: 'mongodb-7.0.16', label: 'mongodb-7.0.16' },
    { id: 'mongodb-7.0.12', label: 'mongodb-7.0.12' },
    { id: 'mongodb-6.0.20', label: 'mongodb-6.0.20' },
    { id: 'mongodb-6.0.16', label: 'mongodb-6.0.16' },
    { id: 'mongodb-5.0.30', label: 'mongodb-5.0.30' },
    { id: 'mongodb-5.0.28', label: 'mongodb-5.0.28' },
    { id: 'mongodb-4.4.29', label: 'mongodb-4.4.29' },
    { id: 'mongodb-4.2.24', label: 'mongodb-4.2.24' },
    { id: 'mongodb-4.0.28', label: 'mongodb-4.0.28' }
  ],
  [DBTypeEnum.mysql]: [
    { id: 'ac-mysql-8.0.30-1', label: 'ac-mysql-8.0.30-1' },
    { id: 'ac-mysql-8.0.30', label: 'ac-mysql-8.0.30' },
    { id: 'mysql-5.7.42', label: 'mysql-5.7.42' }
  ],
  [DBTypeEnum.redis]: [
    { id: 'redis-7.2.7', label: 'redis-7.2.7' },
    { id: 'redis-7.2.4', label: 'redis-7.2.4' },
    { id: 'redis-7.0.6', label: 'redis-7.0.6' }
  ],
  [DBTypeEnum.kafka]: [{ id: 'kafka-3.3.2', label: 'kafka-3.3.2' }],
  [DBTypeEnum.qdrant]: [{ id: 'qdrant-1.5.0', label: 'qdrant-1.5.0' }],
  [DBTypeEnum.nebula]: [{ id: 'nebula-v3.5.0', label: 'nebula-v3.5.0' }],
  [DBTypeEnum.weaviate]: [{ id: 'weaviate-1.18.0', label: 'weaviate-1.18.0' }],
  [DBTypeEnum.milvus]: [{ id: 'milvus-2.3.2', label: 'milvus-2.3.2' }],
  [DBTypeEnum.pulsar]: [
    { id: 'pulsar-3.0.2', label: 'pulsar-3.0.2' },
    { id: 'pulsar-2.11.2', label: 'pulsar-2.11.2' }
  ],
  [DBTypeEnum.clickhouse]: [{ id: 'clickhouse-24.8.3', label: 'clickhouse-24.8.3' }]
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
    // Merge dynamic data with static data, keeping static data as fallback
    Object.keys(DBVersionMap).forEach((dbType) => {
      if (res[dbType as keyof typeof res] && res[dbType as keyof typeof res].length > 0) {
        // Use dynamic data if available
        DBVersionMap[dbType as keyof typeof DBVersionMap] = res[dbType as keyof typeof res];
      }
      // Otherwise keep the existing static data
    });
  } catch (err) {
    retryVersion--;
    if (retryVersion >= 0) {
      setTimeout(() => {
        getDBVersion();
      }, 1000);
    }
  }
};
