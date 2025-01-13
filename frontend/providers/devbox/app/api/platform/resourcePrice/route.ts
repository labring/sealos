import { NextRequest } from 'next/server';

import { jsonRes } from '@/services/backend/response';
import { userPriceType } from '@/types/user';

export const dynamic = 'force-dynamic';

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
  | 'memory'
  | 'storage'
  | 'disk'
  | 'mongodb'
  | 'minio'
  | 'infra-cpu'
  | 'infra-memory'
  | 'infra-disk'
  | 'services.nodeports';

const PRICE_SCALE = 1000000;

const valuationMap: Record<string, number> = {
  cpu: 1000,
  memory: 1024,
  storage: 1024,
  ['services.nodeports']: 1000
};

export async function GET(req: NextRequest) {
  try {
    const { ACCOUNT_URL, SEALOS_DOMAIN } = process.env;
    const baseUrl = ACCOUNT_URL ? ACCOUNT_URL : `https://account-api.${SEALOS_DOMAIN}`;
    const getResourcePrice = async () => {
      try {
        const res = await fetch(`${baseUrl}/account/v1alpha1/properties`, {
          method: 'POST'
        });

        const data: ResourcePriceType = await res.clone().json();

        return data.data.properties;
      } catch (error) {
        console.log(error);
      }
    };

    const resp = (await getResourcePrice()) as ResourcePriceType['data']['properties'];

    const data: userPriceType = {
      cpu: countSourcePrice(resp, 'cpu'),
      memory: countSourcePrice(resp, 'memory'),
      nodeports: countSourcePrice(resp, 'services.nodeports')
    };

    return jsonRes({
      data
    });
  } catch (error) {
    return jsonRes({ code: 500, message: 'get price error' });
  }
}

function countSourcePrice(rawData: ResourcePriceType['data']['properties'], type: ResourceType) {
  const rawPrice = rawData.find((item) => item.name === type)?.unit_price || 1;
  const sourceScale = rawPrice * (valuationMap[type] || 1);
  const unitScale = sourceScale / PRICE_SCALE;
  return unitScale;
}
