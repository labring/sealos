import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import type { BillingData, BillingItem, BillingSpec, Costs, RawCosts } from '@/types/billing';
import { initK8s } from 'sealos-desktop-sdk/service';
import { jsonRes } from '@/services/backend/response';
import { getUserNamespace } from '@/utils/user';
const convertGpu = (_deduction?: RawCosts) =>
  _deduction
    ? Object.entries(_deduction).reduce<Costs>(
        (pre, cur) => {
          if (cur[0] === 'cpu') pre.cpu = cur[1];
          else if (cur[0] === 'memory') pre.memory = cur[1];
          else if (cur[0] === 'storage') pre.storage = cur[1];
          else if (cur[0] === 'network') pre.network = cur[1];
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
          network: 0
        }
      )
    : {
        cpu: 0,
        memory: 0,
        storage: 0,
        network: 0,
        gpu: 0
      };
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const client = await initK8s({ req });
    // get user account payment amount
    const user = client.kube_user.name;
    if (!user) {
      return jsonRes(resp, { code: 403, message: 'user null' });
    }
    const namespace = client.namespace;
    const body = req.body;
    let spec: BillingSpec = { ...body.spec, namespace };
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
        namespace: 'ns-' + client.kube_user.name
      },
      spec
    };
    const group = 'account.sealos.io';
    const version = 'v1';
    const plural = 'billingrecordqueries';
    try {
      await client.k8sCustomObjects.createNamespacedCustomObject(
        group,
        version,
        crdSchema.metadata.namespace,
        plural,
        crdSchema
      );
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));
    } finally {
      const cr = (await client.k8sCustomObjects.getNamespacedCustomObjectStatus(
        group,
        version,
        crdSchema.metadata.namespace,
        plural,
        name
      )) as { body: BillingData<RawCosts> };
      const body = cr?.body;
      if (!body || !body.status) throw new Error('get billing error');
      const item =
        body.status?.item?.map<BillingItem>((v) => ({
          ...v,
          costs: convertGpu(v?.costs)
        })) || [];
      const deductionAmount = convertGpu(cr?.body?.status?.deductionAmount);
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
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get billing error' });
  }
}
