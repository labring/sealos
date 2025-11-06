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
