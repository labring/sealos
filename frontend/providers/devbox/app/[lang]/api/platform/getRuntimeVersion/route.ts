import * as k8s from '@kubernetes/client-node'

import { RuntimeType } from '@/types/devbox'
import { RuntimeTypeEnum } from '@/constants/devbox'
import { runtimeVersionMap } from '@/stores/static'
import { jsonRes } from '@/services/backend/response'
import { K8sApi } from '@/services/backend/kubernetes'

export type Response = Record<
  RuntimeType,
  {
    id: string
    label: string
  }[]
>

// TODO: 补充其他的mock数据
const MOCK: Response = runtimeVersionMap

export async function GET() {
  try {
    // const runtimeVersionMap: Response = {
    //   [RuntimeTypeEnum.java]: [],
    //   [RuntimeTypeEnum.go]: [],
    //   [RuntimeTypeEnum.python]: [],
    //   [RuntimeTypeEnum.node]: [],
    //   [RuntimeTypeEnum.rust]: [],
    //   [RuntimeTypeEnum.php]: [],
    //   [RuntimeTypeEnum.custom]: []
    // }

    // // source price
    // const kc = K8sApi()
    // const k8sCustomObjects = kc.makeApiClient(k8s.CustomObjectsApi)

    // const { body } = (await k8sCustomObjects.listClusterCustomObject(
    //   'apps.kubeblocks.io',
    //   'v1alpha1',
    //   'clusterversions'
    // )) as any

    // body.items.forEach((item: any) => {
    //   const runtime = item?.spec?.clusterDefinitionRef as `${RuntimeTypeEnum}`
    //   if (
    //     runtimeVersionMap[runtime] &&
    //     item?.metadata?.name &&
    //     !runtimeVersionMap[runtime].find((runtime) => runtime.id === item.metadata.name)
    //   ) {
    //     runtimeVersionMap[runtime].push({
    //       id: item.metadata.name,
    //       label: item.metadata.name
    //     })
    //   }
    // })

    return jsonRes({
      data: runtimeVersionMap
    })
  } catch (error) {
    return jsonRes({
      data: MOCK
    })
  }
}
