import { authSession } from '@/service/backend/auth';
import { CRDMeta, GetCRD, GetUserDefaultNameSpace } from '@/service/backend/kubernetes';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApplyYaml } from '@/service/backend/kubernetes';
import * as yaml from 'js-yaml';
import crypto from 'crypto';
import type { BillingData, BillingItem, BillingSpec, Costs, RawCosts } from '@/types/billing';
const convertGpu = (_deduction?: RawCosts) =>
  _deduction
    ? (Object.entries(_deduction) as [keyof RawCosts, number][]).reduce<Costs>(
        (pre, cur) => {
          if (cur[0] === 'cpu') pre.cpu = cur[1];
          else if (cur[0] === 'memory') pre.memory = cur[1];
          else if (cur[0] === 'storage') pre.storage = cur[1];
          else if (cur[0] === 'network') pre.network = cur[1];
          else if (cur[0] === 'services.nodeports') pre.port = cur[1];
          else if (cur[0].startsWith('gpu-')) {
            typeof pre.gpu === 'number' && (pre.gpu += cur[1]);
          }
          return pre;
        },
        {
          cpu: 0,
          memory: 0,
          storage: 0,
          gpu: 0,
          port: 0,
          network: 0
        }
      )
    : {
        cpu: 0,
        memory: 0,
        storage: 0,
        port: 0,
        network: 0,
        gpu: 0
      };
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);
    // get user account payment amount
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 403, message: 'user null' });
    }
    const namespace = GetUserDefaultNameSpace(user.name);
    const body = req.body;
    let spec: BillingSpec = body.spec;
    if (!spec) {
      return jsonRes(resp, { code: 400, error: '参数错误' });
    }
    // 用react query 管理缓存
    let origin = JSON.stringify(spec) + new Date().getTime();
    const hash = crypto.createHash('sha256').update(origin);
    const name = hash.digest('hex');
    const crdSchema = {
      apiVersion: `account.sealos.io/v1`,
      kind: 'BillingRecordQuery',
      metadata: {
        name,
        namespace
      },
      spec
    };
    const meta: CRDMeta = {
      group: 'account.sealos.io',
      version: 'v1',
      namespace,
      plural: 'billingrecordqueries'
    };
    try {
      await ApplyYaml(kc, yaml.dump(crdSchema));
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));
    } finally {
      const crd = (await GetCRD(kc, meta, name)) as { body: BillingData<RawCosts> };
      const body = crd?.body;
      if (!body || !body.status) throw new Error('get billing error');
      const item =
        body.status?.item?.map<BillingItem>((v) => ({
          ...v,
          costs: convertGpu(v?.costs)
        })) || [];
      const deductionAmount = crd.body.status.deductionAmount || 0;
      // convertGpu(crd?.body?.status?.deductionAmount);
      return jsonRes<BillingData>(resp, {
        code: 200,
        data: {
          ...body,
          status: {
            ...body.status,
            deductionAmount,
            item
          }
        }
      });
    }
  } catch (error) {
    // console.log(error);
    jsonRes(resp, { code: 500, message: 'get billing error' });
  }
}
