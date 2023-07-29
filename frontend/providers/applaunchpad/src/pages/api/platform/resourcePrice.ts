import type { NextApiRequest, NextApiResponse } from 'next';
import * as yaml from 'js-yaml';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';

const MOCK = {
  cpu: 10,
  memory: 10,
  storage: 10,
  gpu: [
    { type: 'Navida 4090', price: 30, vm: 3, inventory: 0 },
    { type: 'Navida 4060', price: 20, vm: 4, inventory: 4 },
    { type: 'Navida 4050', price: 10, vm: 8, inventory: 8 }
  ]
};

export type Response = {
  cpu: number;
  memory: number;
  storage: number;
  gpu?: { type: string; price: number; inventory: number; vm: number }[];
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
const PRICE_SCALE = 1000000;

export const valuationMap: Record<string, number> = {
  cpu: 1000,
  memory: 1024,
  storage: 1024
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // source price
    const { applyYamlList, k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

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

    const { body: priceResponse } = (await k8sCustomObjects.getNamespacedCustomObject(
      'account.sealos.io',
      'v1',
      namespace,
      'pricequeries',
      crdJson.metadata.name
    )) as { body: PriceCrdType };

    const data = {
      cpu: countSourcePrice(priceResponse, 'cpu'),
      memory: countSourcePrice(priceResponse, 'memory'),
      storage: countSourcePrice(priceResponse, 'storage')
      // gpu: [{ type: '4090', price: 2.1, inventory: 1, vm: 24 }]
    };

    jsonRes<Response>(res, {
      data
    });
  } catch (error) {
    jsonRes<Response>(res, {
      data: MOCK
    });
    jsonRes(res, { code: 500, message: 'get price error' });
  }
}

function countSourcePrice(rawData: PriceCrdType, type: ResourceType) {
  const rawPrice =
    rawData?.status?.billingRecords?.find((item) => item.resourceType === type)?.price || 1;
  const sourceScale = rawPrice * (valuationMap[type] || 1);
  const unitScale = sourceScale / PRICE_SCALE;
  return unitScale;
}
