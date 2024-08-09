import { DBTypeEnum, RuntimeEnum } from '@/constants/devbox'
import { getDBVersionMap, getRuntimeVersionMap } from '@/api/platform'
import type { Response as DBVersionMapType } from '@/app/api/platform/getDBVersion/route'
import type { Response as RuntimeVersionMapType } from '@/app/api/platform/getRuntimeVersion/route'

// TODO: 考虑resourcePriceResponse的相关代码

export let INSTALL_ACCOUNT = false

let retryGetPrice = 3
let retryGetDBVersion = 3
let retryGetRuntimeVersion = 3
let retryGetEnv = 3

export let dbVersionMap: DBVersionMapType = {
  [DBTypeEnum.postgresql]: [{ id: 'postgresql-14.8.0', label: 'postgresql-14.8.0' }],
  [DBTypeEnum.mongodb]: [{ id: 'mongodb-5.0', label: 'mongodb-5.0' }],
  [DBTypeEnum.mysql]: [{ id: 'ac-mysql-8.0.30', label: 'ac-mysql-8.0.30' }],
  [DBTypeEnum.redis]: [{ id: 'redis-7.0.6', label: 'redis-7.0.6' }],
  [DBTypeEnum.kafka]: [{ id: 'kafka-3.3.2', label: 'kafka-3.3.2' }],
  [DBTypeEnum.qdrant]: [{ id: 'qdrant-1.1.0', label: 'qdrant-1.1.0' }],
  [DBTypeEnum.nebula]: [{ id: 'nebula-v3.5.0', label: 'nebula-v3.5.0' }],
  [DBTypeEnum.weaviate]: [{ id: 'weaviate-1.18.0', label: 'weaviate-1.18.0' }],
  [DBTypeEnum.milvus]: [{ id: 'milvus-2.2.4', label: 'milvus-2.2.4' }]
}

// TODO: 这里需要知道具体的默认版本
export let runtimeVersionMap: RuntimeVersionMapType = {
  [RuntimeEnum.java]: [{ id: 'java-11', label: 'java-11' }],
  [RuntimeEnum.go]: [{ id: 'go-1.17', label: 'go-1.17' }],
  [RuntimeEnum.python]: [{ id: 'python-3.9', label: 'python-3.9' }],
  [RuntimeEnum.node]: [{ id: 'node-16', label: 'node-16' }],
  [RuntimeEnum.rust]: [{ id: 'rust-1.55', label: 'rust-1.55' }],
  [RuntimeEnum.php]: [{ id: 'php-8.0', label: 'php-8.0' }],
  [RuntimeEnum.custom]: [{ id: 'custom', label: 'custom' }]
}

// TODO: 在这里计算价格

export const getDBVersion = async () => {
  try {
    const res = await getDBVersionMap()
    dbVersionMap = res
  } catch (err) {
    retryGetDBVersion--
    if (retryGetDBVersion >= 0) {
      setTimeout(() => {
        getDBVersion()
      }, 1000)
    }
  }
}

export const getRuntimeVersion = async () => {
  try {
    const res = await getRuntimeVersionMap()
    runtimeVersionMap = res
  } catch (err) {
    retryGetRuntimeVersion--
    if (retryGetRuntimeVersion >= 0) {
      setTimeout(() => {
        getRuntimeVersion()
      }, 1000)
    }
  }
}
