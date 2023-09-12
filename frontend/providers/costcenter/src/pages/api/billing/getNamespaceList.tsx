import { authSession } from '@/service/backend/auth';
import { CRDMeta, GetCRD } from '@/service/backend/kubernetes';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApplyYaml } from '@/service/backend/kubernetes';
import * as yaml from 'js-yaml';
import crypto from 'crypto';
import * as k8s from '@kubernetes/client-node';
type Result = {
  status: {
    details: string;
    namespaceList: string[];
    status: string;
  };
};
const getNSList = (kc: k8s.KubeConfig, meta: CRDMeta, name: string) =>
  new Promise<string[]>((resolve, reject) => {
    let time = 5;
    const wrap = () =>
      GetCRD(kc, meta, name)
        .then((res) => {
          const body = res.body as Result;
          if (body?.status?.status?.toLowerCase() === 'completed') {
            resolve(body.status.namespaceList);
          } else {
            return Promise.reject([]);
          }
        })
        .catch((_) => {
          if (time >= 0) {
            time--;
            setTimeout(wrap, 1000);
          } else {
            reject([]);
          }
        });
    wrap();
  });

export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);
    // get user account payment amount
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 403, message: 'user null' });
    }
    const namespace = 'ns-' + user.name;
    // 用react query 管理缓存
    const hash = crypto.createHash('sha256').update('' + new Date().getTime());
    const name = hash.digest('hex');
    const crdSchema = {
      apiVersion: `account.sealos.io/v1`,
      kind: 'NamespaceBillingHistory',
      metadata: {
        name,
        namespace
      },
      spec: {
        type: -1
      }
    };

    const meta: CRDMeta = {
      group: 'account.sealos.io',
      version: 'v1',
      namespace,
      plural: 'namespacebillinghistories'
    };
    await ApplyYaml(kc, yaml.dump(crdSchema));
    const nsList = await getNSList(kc, meta, name);
    return jsonRes<{ nsList: string[] }>(resp, {
      code: 200,
      data: {
        nsList
      }
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get namespaceList error' });
  }
}
