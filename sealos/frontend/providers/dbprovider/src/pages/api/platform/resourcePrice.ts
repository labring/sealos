import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';
import type { userPriceType } from '@/types/user';

export type Response = {
  cpu: number;
  memory: number;
  storage: number;
  nodeports: number;
};

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

const PRICE_SCALE = 1000000;

export const valuationMap: Record<string, number> = {
  cpu: 1000,
  memory: 1024,
  storage: 1024,
  'services.nodeports': 1000
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const priceResponse = await getResourcePrice();

    const data: userPriceType = {
      cpu: countSourcePrice(priceResponse, 'cpu'),
      memory: countSourcePrice(priceResponse, 'memory'),
      storage: countSourcePrice(priceResponse, 'storage'),
      nodeports: countSourcePrice(priceResponse, 'services.nodeports')
    };

    jsonRes<userPriceType>(res, {
      data
    });
  } catch (error) {
    jsonRes(res, { code: 500, message: 'get price error' });
  }
}

function countSourcePrice(rawData: ResourcePriceType['data']['properties'], type: ResourceType) {
  const rawPrice = rawData.find((item) => item.name === type)?.unit_price || 1;
  const sourceScale = rawPrice * (valuationMap[type] || 1);
  const unitScale = sourceScale / PRICE_SCALE;
  return unitScale;
}

const getResourcePrice = async () => {
  const url = process.env.BILLING_URL;

  const res = await fetch(`${url}/account/v1alpha1/properties`, {
    method: 'POST'
  });
  const data: ResourcePriceType = await res.json();

  return data.data.properties;
};
