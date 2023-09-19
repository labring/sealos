import { authSession } from '@/services/backend/auth';
import type { NextApiRequest, NextApiResponse } from 'next';
import * as yaml from 'js-yaml';
import { jsonRes } from '@/services/backend/response';
import { CRDMeta, ValuationBillingRecord, ValuationData } from '@/types';
import { ApplyYaml, GetCRD } from '@/services/backend/kubernetes/user';
import { IncomingMessage } from 'http';

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) {
      return jsonRes(resp, { code: 401, message: 'token verify error' });
    }
    const namespace = payload.user.nsid;
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
      await ApplyYaml(payload.kc, yaml.dump(crdSchema));
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));
    } finally {
      const crd = (await GetCRD(payload.kc, meta, name)) as {
        response: IncomingMessage;
        body: ValuationData;
      };
      const billingRecords = crd?.body?.status?.billingRecords || [];
      return jsonRes<{ billingRecords: ValuationBillingRecord[] }>(resp, {
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
