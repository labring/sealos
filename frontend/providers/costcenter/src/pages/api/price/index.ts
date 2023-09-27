import { authSession } from '@/service/backend/auth';
import { CRDMeta, GetCRD, GetUserDefaultNameSpace } from '@/service/backend/kubernetes';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApplyYaml } from '@/service/backend/kubernetes';
import * as yaml from 'js-yaml';
import { ValuationBillingRecord, ValuationData } from '@/types/valuation';
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);

    // get user account payment amount
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 403, message: 'user null' });
    }
    const namespace = GetUserDefaultNameSpace(user.name);
    const name = 'price';
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
    } catch {}
    const billingRecords = await new Promise<ValuationBillingRecord[]>((resolve, reject) => {
      let retry = 3;
      const wrap = () =>
        GetCRD(kc, meta, name)
          .then((res) => {
            const crd = res.body as ValuationData;
            resolve(crd.status.billingRecords);
          })
          .catch((err) => {
            if (retry-- >= 0) wrap();
            else reject(err);
          });
      wrap();
    });
    return jsonRes<{ billingRecords: ValuationBillingRecord[] }>(resp, {
      code: 200,
      data: {
        billingRecords
      }
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get price error' });
  }
}
