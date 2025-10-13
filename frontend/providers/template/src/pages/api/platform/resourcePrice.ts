import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
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

const PRICE_SCALE = 1000000;

export const valuationMap: Record<string, number> = {
  cpu: 1000,
  memory: 1024,
  storage: 1024,
  'services.nodeports': 1
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
    console.log(error);
    jsonRes(res, { code: 500, message: 'get price error' });
  }
}

function countSourcePrice(rawData: ResourcePriceType['data']['properties'], type: string) {
  const rawPrice = rawData.find((item) => item.name === type)?.unit_price || 1;
  const sourceScale = rawPrice * (valuationMap[type] || 1);
  const unitScale = sourceScale / PRICE_SCALE;
  return unitScale;
}

const getResourcePrice = async () => {
  const baseUrl = process.env.ACCOUNT_URL
    ? process.env.ACCOUNT_URL
    : `https://account-api.${process.env.SEALOS_CLOUD_DOMAIN}`;

  const res = await fetch(`${baseUrl}/account/v1alpha1/properties`, {
    method: 'POST'
  });
  const data: ResourcePriceType = await res.json();

  return data.data.properties;
};
