import type { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from '@/services/backend/auth';
import { ListCRD } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import { CRDMeta, TAppCRList, TAppConfig } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token is vaild' });
    const kc = payload.kc;
    const nsid = payload.user.nsid;
    console.log('payload???', payload);
    const getMeta = (namespace = 'app-system') => ({
      group: 'app.sealos.io',
      version: 'v1',
      namespace,
      plural: 'apps'
    });
    const getRawAppList = async (meta: CRDMeta) =>
      ((await ListCRD(kc, meta)).body as TAppCRList).items || [];

    const defaultArr = (await getRawAppList(getMeta())).map<TAppConfig>((item) => {
      return { key: `system-${item.metadata.name}`, ...item.spec };
    });

    const userArr = (await getRawAppList(getMeta(nsid))).map<TAppConfig>((item) => {
      return { key: `user-${item.metadata.name}`, ...item.spec, displayType: 'normal' };
    });

    let apps = [...defaultArr, ...userArr].filter((item) => item.displayType !== 'hidden');

    jsonRes(res, { data: apps });
  } catch (err) {
    jsonRes(res, { code: 500, data: err });
  }
}
