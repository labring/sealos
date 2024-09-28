import type { NextApiRequest, NextApiResponse } from 'next';
import { POST } from '@/services/request';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';
import type { userPriceType } from '@/types/user';

type properties = {
  properties: property[];
};

type property = {
  name: string;
  unit_price: number;
  unit: string;
};

export function transformProperties(data: properties): userPriceType {
  const userPrice: userPriceType = {
    cpu: 0,
    memory: 0,
    storage: 0,
    nodeports: 0
  };

  data.properties.forEach((property: property) => {
    switch (property.name) {
      case 'cpu':
        userPrice.cpu = property.unit_price;
        break;
      case 'memory':
        userPrice.memory = property.unit_price;
        break;
      case 'storage':
        userPrice.storage = property.unit_price;
        break;
      case 'services.nodeports':
        userPrice.nodeports = property.unit_price;
        break;
    }
  });

  return userPrice;
}

const getResourcePrice = async () => {
  const baseUrl = process.env.ACCOUNT_URL
    ? process.env.ACCOUNT_URL
    : `https://account-api.${process.env.SEALOS_CLOUD_DOMAIN}`;

  const res = await fetch(`${baseUrl}/account/v1alpha1/properties`, {
    method: 'POST'
  });
  const data = await res.json();
  return transformProperties(data.data as properties);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const data = await getResourcePrice();

    jsonRes<userPriceType>(res, {
      code: 200,
      data: data
    });
  } catch (error) {
    console.log('get resoure price error: ', error);
    jsonRes(res, { code: 500, message: 'get price error' });
  }
}
