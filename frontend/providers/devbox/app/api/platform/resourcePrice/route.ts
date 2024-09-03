import * as yaml from 'js-yaml'
import { NextRequest } from 'next/server'

import { getK8s } from '@/services/backend/kubernetes'
import { jsonRes } from '@/services/backend/response'
import { authSession } from '@/services/backend/auth'

export const dynamic = 'force-dynamic'

export type Response = {
  cpu: number
  memory: number
  port: number
}

type ResourceType =
  | 'cpu'
  | 'memory'
  | 'storage'
  | 'disk'
  | 'mongodb'
  | 'minio'
  | 'infra-cpu'
  | 'infra-memory'
  | 'infra-disk'
  | 'services.nodeports'

type PriceCrdType = {
  apiVersion: 'account.sealos.io/v1'
  kind: 'PriceQuery'
  status: {
    billingRecords: {
      price: number
      resourceType: ResourceType
    }[]
  }
}
const PRICE_SCALE = 1000000

export const valuationMap: Record<string, number> = {
  cpu: 1000,
  memory: 1024,
  storage: 1024,
  port: 2
}

export async function GET(req: NextRequest) {
  try {
    const headerList = req.headers

    // source price
    const { applyYamlList, k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    const crdJson = {
      apiVersion: `account.sealos.io/v1alpha`,
      kind: 'PriceQuery',
      metadata: {
        name: 'prices',
        namespace
      },
      spec: {}
    }

    // const crdYaml = yaml.dump(crdJson)

    // try {
    //   await applyYamlList([crdYaml], 'replace')
    //   await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000))
    // } catch (error) {}

    // const { body: priceResponse } = (await k8sCustomObjects.getNamespacedCustomObject(
    //   'account.sealos.io',
    //   'v1alpha',
    //   namespace,
    //   'pricequeries',
    //   crdJson.metadata.name
    // )) as { body: PriceCrdType }

    // console.log('priceResponse', priceResponse)

    // const data = {
    //   cpu: countSourcePrice(priceResponse, 'cpu'),
    //   memory: countSourcePrice(priceResponse, 'memory')
    // }
    return jsonRes({
      data: {
        cpu: 0.1,
        memory: 0.2,
        port: 2
      }
    })
  } catch (error) {
    console.log(error)
    jsonRes({ code: 500, message: 'get price error' })
  }
}

function countSourcePrice(rawData: PriceCrdType, type: ResourceType) {
  const rawPrice =
    rawData?.status?.billingRecords.find((item) => item.resourceType === type)?.price || 1
  const sourceScale = rawPrice * (valuationMap[type] || 1)
  const unitScale = sourceScale / PRICE_SCALE
  return unitScale
}
