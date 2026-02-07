import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import type { userPriceType } from '@/types/user';
import { GpuNodeType, ResourceType } from '@/types/app';
import { getGpuNode } from '@/services/backend/gpu';

type ResourcePriceType = {
  data: {
    properties: {
      name: string;
      unit_price: number;
      unit: string;
    }[];
  };
};

const PRICE_SCALE = 1000000;

export const valuationMap: Record<string, number> = {
  cpu: 1000,
  memory: 1024,
  storage: 1024,
  gpu: 1000,
  'services.nodeports': 1
};

const MOCK_GPU_NODES = [
  {
    'gpu.count': 2,
    'gpu.memory': 24576,
    'gpu.product': 'NVIDIA GeForce RTX 3090',
    'gpu.alias': 'NVIDIA GeForce RTX 3090',
    'gpu.available': 99,
    'gpu.used': 0,
    'gpu.ref': 'RTX-3090',
    icon: 'nvidia',
    name: { zh: 'RTX-3090', en: 'RTX-3090' },
    resource: { card: 'nvidia.com/gpu' }
  },
  {
    'gpu.count': 4,
    'gpu.memory': 24576,
    'gpu.product': 'NVIDIA-Tesla P40',
    'gpu.alias': 'NVIDIA-Tesla P40',
    'gpu.available': 99,
    'gpu.used': 2,
    'gpu.ref': 'Tesla-P40',
    icon: 'nvidia',
    name: { zh: 'Tesla-P40', en: 'Tesla-P40' },
    resource: { card: 'nvidia.com/gpu' }
  },
  {
    'gpu.count': 2,
    'gpu.memory': 24576,
    'gpu.product': 'kunlunxin P800',
    'gpu.alias': 'kunlunxin P800',
    'gpu.available': 99,
    'gpu.used': 0,
    'gpu.ref': 'kunlunxin-P800',
    icon: 'kunlunxin',
    name: { zh: '昆仑芯-P800', en: 'kunlunxin-P800' },
    resource: { card: 'kunlunxin.com/vxpu' }
  }
];

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const gpuEnabled = global.AppConfig.common.gpuEnabled;
    let [gpuNodes, priceResponse] = await Promise.all([getGpuNode(), getResourcePrice()]);

    console.log(gpuNodes, 'Mock gpuNodes');
    console.log(priceResponse, 'priceResponse');

    const data: userPriceType = {
      cpu: countSourcePrice(priceResponse, 'cpu'),
      memory: countSourcePrice(priceResponse, 'memory'),
      storage: countSourcePrice(priceResponse, 'storage'),
      gpu: gpuEnabled ? countGpuSource(priceResponse, gpuNodes) : undefined,
      nodeports: countSourcePrice(priceResponse, 'services.nodeports'),
      ephemeralStorage: countSourcePrice(priceResponse, 'storage')
    };

    jsonRes<userPriceType>(res, {
      data
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, message: 'get price error' });
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
    if (!item.name.startsWith('gpu-')) return;

    const refKey = item.name.replace('gpu-', '');

    const gpuNode = gpuNodes.find((node) => node['gpu.ref'] === refKey);
    if (!gpuNode) return;

    const manufacturers = gpuNode.icon || 'nvidia';

    gpuList.push({
      alias: gpuNode['gpu.alias'],
      type: gpuNode['gpu.product'],
      price: (item.unit_price * valuationMap.gpu) / PRICE_SCALE,
      inventory: +gpuNode['gpu.available'],
      vm: +gpuNode['gpu.memory'] / 1024,
      icon: gpuNode.icon,
      manufacturers: manufacturers,
      name: gpuNode.name,
      resource: gpuNode.resource
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
