import { authSession } from '@/service/backend/auth';
import { CRDMeta, GetCRD } from '@/service/backend/kubernetes';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApplyYaml } from '@/service/backend/kubernetes';
import * as yaml from 'js-yaml';
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);

    // get user account payment amount
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 401, message: 'user null' });
    }
    const namespace = 'ns-' + user.name;
    const name = 'prices'
    const crdSchema = {
      apiVersion: `account.sealos.io/v1`,
      kind: 'PriceQuery',
      metadata: {
        name,
        namespace
      },
      spec:{}
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
      const { body } = await GetCRD(kc, meta, name);
      return jsonRes(resp, {
        code: 200,
        data: body
      });
    }
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get price error' });
  }
}