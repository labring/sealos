import { RuntimeEnum } from '@/constants/devbox'
import { getRuntimeVersionMap } from '@/api/platform'
import type { Response as RuntimeVersionMapType } from '@/app/api/platform/getRuntimeVersion/route'

// TODO: 考虑resourcePriceResponse的相关代码

let retryGetRuntimeVersion = 3

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
