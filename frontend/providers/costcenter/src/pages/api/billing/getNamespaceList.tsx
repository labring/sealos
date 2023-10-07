import { authSession } from '@/service/backend/auth';
import { CRDMeta, GetCRD, GetUserDefaultNameSpace } from '@/service/backend/kubernetes';
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
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 403, message: 'user null' });
    }
    // 要和kc保持一致
    const namespace = kc.getContexts()[0].namespace || GetUserDefaultNameSpace(user.name);
    const name = new Date().getTime() + 'namespacequery';
    const crdSchema = {
      apiVersion: `account.sealos.io/v1`,
      kind: 'BillingInfoQuery',
      metadata: {
        name
      },
      spec: {
        queryType: 'NamespacesHistory'
      }
    };
    const meta: CRDMeta = {
      group: 'account.sealos.io',
      version: 'v1',
      namespace,
      plural: 'billinginfoqueries'
    };
    try {
      await ApplyYaml(kc, yaml.dump(crdSchema));
    } catch (err) {
      console.log('error', err);
    }
    const result = await new Promise<string>((resolve, reject) => {
      let retry = 3;
      const wrap = () =>
        GetCRD(kc, meta, name)
          .then((res) => {
            const body = res.body as { status: any };
            const { result, status } = body.status as Record<string, string>;
            if (status.toLocaleLowerCase() === 'completed') resolve(result as string);
            else return Promise.reject();
          })
          .catch((err) => {
            if (retry-- >= 0) wrap();
            else reject(err);
          });
      wrap();
    });
    return jsonRes(resp, {
      code: 200,
      data: {
        nsList: JSON.parse(result)
      }
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get namespaceList error' });
  }
}
