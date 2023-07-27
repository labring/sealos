import { authSession } from '@/service/backend/auth';
import { CRDMeta, GetCRD } from '@/service/backend/kubernetes';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApplyYaml } from '@/service/backend/kubernetes';
import * as yaml from 'js-yaml';
import { ValuationData } from '@/types/valuation';
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);

    // get user account payment amount
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 401, message: 'user null' });
    }
    const namespace = 'ns-' + user.name;
    const name = 'prices';
    const crdSchema = {
      apiVersion: `account.sealos.io/v1`,
      kind: 'PriceQuery',
      metadata: {
        name,
        namespace
      },
      spec: {}
    };
    const meta: CRDMeta = {
      group: 'account.sealos.io',
      version: 'v1',
      namespace,
      plural: 'pricequeries'
    };
    try {
      await ApplyYaml(kc, yaml.dump(crdSchema));
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));
    } finally {
      const { body } = (await GetCRD(kc, meta, name)) as { body: ValuationData };
      const billingRecords = body?.status?.billingRecords || [];
      // mock
      // billingRecords.push({ 'resourceType': "gpu-RTX_4070", price: 3 })
      // billingRecords.push({ 'resourceType': "gpu-RTX_4050", price: 7 })
      // billingRecords.push({ 'resourceType': "gpu-RTX_4080", price: 5 })
      // billingRecords.push({ 'resourceType': "gpu-RTX_4090", price: 2 })
      // billingRecords.push({ 'resourceType': "gpu-RTX_3070", price: 3 })
      // billingRecords.push({ 'resourceType': "gpu-RTX_3050", price: 7 })
      // billingRecords.push({ 'resourceType': "gpu-RTX_3080", price: 5 })
      // billingRecords.push({ 'resourceType': "gpu-RTX_3090", price: 2 })
      // billingRecords.push({ 'resourceType': "gpu-RTX_2070", price: 3 })
      // billingRecords.push({ 'resourceType': "gpu-RTX_2050", price: 7 })
      // billingRecords.push({ 'resourceType': "gpu-RTX_2080", price: 5 })
      // billingRecords.push({ 'resourceType': "gpu-RTX_2090", price: 2 })
      jsonRes(resp, {
        code: 200,
        data: {
          billingRecords
        }
      });
    }
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get price error' });
  }
}
