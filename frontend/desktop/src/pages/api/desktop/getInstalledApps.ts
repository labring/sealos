import type { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from '@/services/backend/auth';
import { GetUserDefaultNameSpace, ListCRD } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import { TApp, TAppCR, TAppCRList, TAppConfig } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);

    const kube_user = kc.getCurrentUser();
    if (kube_user === null) {
      return jsonRes(res, { code: 403, message: 'user is null' });
    }

    const defaultMeta = {
      group: 'app.sealos.io',
      version: 'v1',
      namespace: 'app-system',
      plural: 'apps'
    };

    const meta = {
      group: 'app.sealos.io',
      version: 'v1',
      namespace: GetUserDefaultNameSpace(kube_user.name),
      plural: 'apps'
    };
    const defaultResult = await ListCRD(kc, defaultMeta) as {
      body: TAppCRList
    };
    const userResult = await ListCRD(kc, meta) as {
      body: TAppCRList
    };

    const defaultArr = defaultResult?.body?.items.map<TAppConfig>((item) => {
      return { key: `system-${item.metadata.name}`, ...item.spec };
    });
    const userArr = userResult?.body?.items.map<TAppConfig>((item) => {
      return { key: `user-${item.metadata.name}`, ...item.spec, displayType: 'normal' };
    });

    let apps = [...defaultArr, ...userArr].filter((item) => item.displayType !== 'hidden');

    jsonRes(res, { data: apps });
  } catch (err) {
    jsonRes(res, { code: 500, data: err });
  }
}
