import * as k8s from '@kubernetes/client-node'

import { RuntimeEnum } from '@/constants/devbox'
import { runtimeVersionMap } from '@/stores/static'
import { jsonRes } from '@/services/backend/response'
import { K8sApi } from '@/services/backend/kubernetes'

// NOTE: 这里可能有点问题，可能RuntimeEnum需要转换成字符串
export type Response = Record<
  RuntimeEnum,
  {
    id: string
    label: string
  }[]
>

// TODO: 补充其他的mock数据
const MOCK: Response = runtimeVersionMap

export async function GET() {
  try {
    const runtimeVersionMap: Response = {
      [RuntimeEnum.java]: [],
      [RuntimeEnum.go]: [],
      [RuntimeEnum.python]: [],
      [RuntimeEnum.node]: [],
      [RuntimeEnum.rust]: [],
      [RuntimeEnum.php]: [],
      [RuntimeEnum.custom]: []
    }

    // source price
    const kc = K8sApi()
    const k8sCustomObjects = kc.makeApiClient(k8s.CustomObjectsApi)

    const { body } = (await k8sCustomObjects.listClusterCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      'clusterversions'
    )) as any

    body.items.forEach((item: any) => {
      const runtime = item?.spec?.clusterDefinitionRef as `${RuntimeEnum}`
      if (
        runtimeVersionMap[runtime] &&
        item?.metadata?.name &&
        !runtimeVersionMap[runtime].find((runtime) => runtime.id === item.metadata.name)
      ) {
        runtimeVersionMap[runtime].push({
          id: item.metadata.name,
          label: item.metadata.name
        })
      }
    })

    jsonRes({
      data: runtimeVersionMap
    })
  } catch (error) {
    console.log(error)
    jsonRes({
      data: MOCK
    })
  }
}
