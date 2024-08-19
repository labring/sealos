import { RuntimeTypeEnum } from '@/constants/devbox'
import { getRuntimeVersionMap, getResourcePrice, getNamespace } from '@/api/platform'
import type { Response as RuntimeVersionMapType } from '@/app/api/platform/getRuntimeVersion/route'
import type { Response as resourcePriceResponse } from '@/app/api/platform/resourcePrice/route'

// TODO: 这里需要知道具体的价格
export let SOURCE_PRICE: resourcePriceResponse = {
  cpu: 0.067,
  memory: 0.033792
}
export let INSTALL_ACCOUNT = false
export let NAMESPACE = 'default'

let retryGetRuntimeVersion = 3
let retryGetPrice = 3
let retryGetNamespace = 3

// NOTE: 枚举列表大小写不一致，需要统一
// TODO: 这里需要知道具体的默认版本
export let runtimeVersionMap: RuntimeVersionMapType = {
  [RuntimeTypeEnum.java]: [{ id: '11', label: 'java-11' }],
  [RuntimeTypeEnum.go]: [{ id: '1.17', label: 'go-1.17' }],
  [RuntimeTypeEnum.python]: [{ id: '3.9', label: 'python-3.9' }],
  [RuntimeTypeEnum.node]: [{ id: '16', label: 'node-16' }],
  [RuntimeTypeEnum.rust]: [{ id: '1.55', label: 'rust-1.55' }],
  [RuntimeTypeEnum.php]: [{ id: '8.0', label: 'php-8.0' }],
  [RuntimeTypeEnum.custom]: [{ id: 'custom', label: 'custom' }]
}

export const getUserPrice = async () => {
  try {
    const res = await getResourcePrice()
    SOURCE_PRICE = res
    INSTALL_ACCOUNT = true
  } catch (err) {
    retryGetPrice--
    if (retryGetPrice >= 0) {
      setTimeout(() => {
        getUserPrice()
      }, 1000)
    }
  }
}

export const getGlobalNamespace = async () => {
  try {
    const res = await getNamespace()
    NAMESPACE = res
  } catch (err) {
    retryGetNamespace--
    if (retryGetNamespace >= 0) {
      setTimeout(() => {
        getNamespace()
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

export let SEALOS_DOMAIN = 'cloud.sealos.io'
export let INGRESS_SECRET = 'wildcard-cert'
