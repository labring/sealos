import { authSession } from '@/service/backend/auth';
import { CRDMeta, GetCRD, GetUserDefaultNameSpace } from '@/service/backend/kubernetes';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApplyYaml } from '@/service/backend/kubernetes';
import * as yaml from 'js-yaml';
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 403, message: 'user null' });
    }
    const namespace = GetUserDefaultNameSpace(user.name);
    const name = new Date().getTime() + 'appquery';
    const crdSchema = {
      apiVersion: `account.sealos.io/v1`,
      kind: 'BillingInfoQuery',
      metadata: {
        name
      },
      spec: {
        queryType: 'AppType'
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
        appList: JSON.parse(result)
      }
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get price error' });
  }
}
