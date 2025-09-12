import type { NextApiRequest, NextApiResponse } from 'next';
import { getK8s, K8sApiDefault } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';
import { CoreV1Api } from '@kubernetes/client-node';
import type { userPriceType } from '@/types/user';

type ResourcePriceType = {
  data: {
    properties: {
      name: string;
      unit_price: number;
      unit: string;
    }[];
  };
};

type ResourceType =
  | 'cpu'
  | 'infra-cpu'
  | 'storage'
  | 'memory'
  | 'disk'
  | 'mongodb'
  | 'minio'
  | 'infra-memory'
  | 'infra-disk'
  | 'services.nodeports';

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
  gpu: 1000,
  'services.nodeports': 1
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const gpuEnabled = global.AppConfig.common.gpuEnabled;
    const [priceResponse, gpuNodes] = await Promise.all([
      getResourcePrice(),
      gpuEnabled ? getGpuNode() : Promise.resolve([])
    ]);

    const data: userPriceType = {
      cpu: countSourcePrice(priceResponse, 'cpu'),
      memory: countSourcePrice(priceResponse, 'memory'),
      storage: countSourcePrice(priceResponse, 'storage'),
      gpu: gpuEnabled ? countGpuSource(priceResponse, gpuNodes) : undefined,
      nodeports: countSourcePrice(priceResponse, 'services.nodeports')
    };

    jsonRes<userPriceType>(res, {
      data
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, message: 'get price error' });
  }
}

/* get gpu nodes by configmap. */
export async function getGpuNode() {
  const gpuCrName = 'node-gpu-info';
  const gpuCrNS = 'node-system';

  try {
    const kc = K8sApiDefault();
    const { body } = await kc.makeApiClient(CoreV1Api).readNamespacedConfigMap(gpuCrName, gpuCrNS);
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

function countSourcePrice(rawData: ResourcePriceType['data']['properties'], type: ResourceType) {
  const rawPrice = rawData.find((item) => item.name === type)?.unit_price || 1;
  const sourceScale = rawPrice * (valuationMap[type] || 1);
  const unitScale = sourceScale / PRICE_SCALE;
  return unitScale;
}

function countGpuSource(rawData: ResourcePriceType['data']['properties'], gpuNodes: GpuNodeType[]) {
  const gpuList: userPriceType['gpu'] = [];

  // count gpu price by gpuNode and accountPriceConfig
  rawData?.forEach((item) => {
    if (!item.name.startsWith('gpu')) return;
    const gpuType = item.name.replace('gpu-', '');
    const gpuNode = gpuNodes.find((item) => item['gpu.product'] === gpuType);
    if (!gpuNode) return;
    gpuList.push({
      alias: gpuNode['gpu.alias'],
      type: gpuNode['gpu.product'],
      price: (item.unit_price * valuationMap.gpu) / PRICE_SCALE,
      inventory: +gpuNode['gpu.count'],
      vm: +gpuNode['gpu.memory'] / 1024
    });
  });

  return gpuList.length === 0 ? undefined : gpuList;
}

const getResourcePrice = async () => {
  const url = global.AppConfig.launchpad.components.billing.url;

  const res = await fetch(`${url}/account/v1alpha1/properties`, {
    method: 'POST'
  });
  const data: ResourcePriceType = await res.json();

  return data.data.properties;
};
