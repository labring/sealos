import { RuntimeEnum } from '@/constants/devbox'
import { getRuntimeVersionMap, getResourcePrice } from '@/api/platform'
import type { Response as RuntimeVersionMapType } from '@/app/api/platform/getRuntimeVersion/route'
import type { Response as resourcePriceResponse } from '@/app/api/platform/resourcePrice/route'

// TODO: 这里需要知道具体的价格
export let SOURCE_PRICE: resourcePriceResponse = {
  cpu: 0.067,
  memory: 0.033792,
  storage: 0.002048,
  nodeports: 0.5
}
export let INSTALL_ACCOUNT = false

let retryGetRuntimeVersion = 3
let retryGetPrice = 3

// NOTE: 枚举列表大小写不一致，需要统一
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
