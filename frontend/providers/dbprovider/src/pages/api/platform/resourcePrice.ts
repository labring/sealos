import type { NextApiRequest, NextApiResponse } from 'next';
import * as yaml from 'js-yaml';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';

export type Response = {
  cpu: number;
  memory: number;
  storage: number;
  nodeports: number;
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
      kubeconfig: await authSession(req)
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
      storage: countSourcePrice(priceResponse, 'storage'),
      nodeports: countSourcePrice(priceResponse, 'services.nodeports')
    };

    jsonRes(res, {
      data
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, message: 'get price error' });
  }
}

function countSourcePrice(rawData: PriceCrdType, type: ResourceType) {
  const rawPrice =
    rawData?.status?.billingRecords.find((item) => item.resourceType === type)?.price || 1;
  const sourceScale = rawPrice * (valuationMap[type] || 1);
  const unitScale = sourceScale / PRICE_SCALE;
  return unitScale;
}
