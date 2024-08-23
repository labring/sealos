import type { NextApiRequest, NextApiResponse } from 'next';
import * as yaml from 'js-yaml';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';
import { CoreV1Api, CustomObjectsApi } from '@kubernetes/client-node';
import type { userPriceType } from '@/types/user';

type ResourceType =
  | 'cpu'
  | 'infra-cpu'
  | 'storage'
  | 'memory'
  | 'disk'
  | 'mongodb'
  | 'minio'
  | 'infra-memory'
  | 'infra-disk';
type PriceCrdType = {
  apiVersion: 'account.sealos.io/v1';
  kind: 'PriceQuery';
  status: {
    billingRecords: {
      price: number;
      resourceType: ResourceType;
    }[];
  };
};
type GpuNodeType = {
  'gpu.count': number;
  'gpu.memory': number;
  'gpu.product': string;
  'gpu.alias': string;
};
const PRICE_SCALE = 1000000;

export const valuationMap: Record<string, number> = {
  cpu: 1000,
  memory: 1024,
  storage: 1024,
  gpu: 1000
};

const gpuCrName = 'node-gpu-info';
const gpuCrNS = 'node-system';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // source price
    const { applyYamlList, k8sCustomObjects, k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    // apply price cr and get account price
    const crdJson = {
      apiVersion: `account.sealos.io/v1`,
      kind: 'PriceQuery',
      metadata: {
        name: 'prices',
        namespace
      },
      spec: {}
    };
    const crdYaml = yaml.dump(crdJson);

    try {
      await applyYamlList([crdYaml], 'replace');
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));
    } catch (error) {}

    const [priceResponse, gpuNodes] = await Promise.all([
      getPriceCr({
        name: crdJson.metadata.name,
        namespace,
        k8sCustomObjects
      }),
      getGpuNode({ k8sCore })
    ]);

    const data = {
      cpu: countSourcePrice(priceResponse, 'cpu'),
      memory: countSourcePrice(priceResponse, 'memory'),
      storage: countSourcePrice(priceResponse, 'storage'),
      gpu: countGpuSource(priceResponse, gpuNodes)
    };

    jsonRes<userPriceType>(res, {
      data
    });
  } catch (error) {
    console.log(error);

    jsonRes(res, { code: 500, message: 'get price error' });
  }
}

async function getPriceCr({
  name,
  namespace,
  k8sCustomObjects
}: {
  name: string;
  namespace: string;
  k8sCustomObjects: CustomObjectsApi;
}) {
  const { body: priceResponse } = (await k8sCustomObjects.getNamespacedCustomObject(
    'account.sealos.io',
    'v1',
    namespace,
    'pricequeries',
    name
  )) as { body: PriceCrdType };

  return priceResponse;
}

/* get gpu nodes by configmap. */
async function getGpuNode({ k8sCore }: { k8sCore: CoreV1Api }) {
  try {
    const { body } = await k8sCore.readNamespacedConfigMap(gpuCrName, gpuCrNS);
    const gpuMap = body?.data?.gpu;
    if (!gpuMap || !body?.data?.alias) return [];
    const alias = (JSON.parse(body?.data?.alias) || {}) as Record<string, string>;

    const parseGpuMap = JSON.parse(gpuMap) as Record<
      string,
      {
        'gpu.count': string;
        'gpu.memory': string;
        'gpu.product': string;
      }
    >;

    const gpuValues = Object.values(parseGpuMap).filter((item) => item['gpu.product']);

    const gpuList: GpuNodeType[] = [];

    // merge same type gpu
    gpuValues.forEach((item) => {
      const index = gpuList.findIndex((gpu) => gpu['gpu.product'] === item['gpu.product']);
      if (index > -1) {
        gpuList[index]['gpu.count'] += Number(item['gpu.count']);
      } else {
        gpuList.push({
          ['gpu.count']: +item['gpu.count'],
          ['gpu.memory']: +item['gpu.memory'],
          ['gpu.product']: item['gpu.product'],
          ['gpu.alias']: alias[item['gpu.product']] || item['gpu.product']
        });
      }
    });

    return gpuList;
  } catch (error) {
    return [];
  }
}

function countSourcePrice(rawData: PriceCrdType, type: ResourceType) {
  const rawPrice =
    rawData?.status?.billingRecords?.find((item) => item.resourceType === type)?.price || 1;
  const sourceScale = rawPrice * (valuationMap[type] || 1);
  const unitScale = sourceScale / PRICE_SCALE;
  return unitScale;
}
function countGpuSource(rawData: PriceCrdType, gpuNodes: GpuNodeType[]) {
  const gpuList: userPriceType['gpu'] = [];

  // count gpu price by gpuNode and accountPriceConfig
  rawData?.status?.billingRecords?.forEach((item) => {
    if (!item.resourceType.startsWith('gpu')) return;
    const gpuType = item.resourceType.replace('gpu-', '');
    const gpuNode = gpuNodes.find((item) => item['gpu.product'] === gpuType);
    if (!gpuNode) return;
    gpuList.push({
      alias: gpuNode['gpu.alias'],
      type: gpuNode['gpu.product'],
      price: (item.price * valuationMap.gpu) / PRICE_SCALE,
      inventory: +gpuNode['gpu.count'],
      vm: +gpuNode['gpu.memory'] / 1024
    });
  });

  return gpuList.length === 0 ? undefined : gpuList;
}
