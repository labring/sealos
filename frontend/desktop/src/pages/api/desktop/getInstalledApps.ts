import type { NextApiRequest, NextApiResponse } from 'next';
import { K8sApi, ListCRD } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import { CRDMeta, TAppCRList, TAppConfig } from '@/types';
import { getUserKubeconfigNotPatch } from '@/services/backend/kubernetes/admin';
import { verifyAccessToken } from '@/services/backend/auth';

import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token is invaild' });
    const _kc = await getUserKubeconfigNotPatch(payload.userCrName);
    if (!_kc) return jsonRes(res, { code: 404, message: 'user is not found' });
    const realKc = switchKubeconfigNamespace(_kc, payload.workspaceId);
    const kc = K8sApi(realKc);
    const getMeta = (namespace = 'app-system') => ({
      group: 'app.sealos.io',
      version: 'v1',
      namespace,
      plural: 'apps'
    });

    const getRawAppList = async (meta: CRDMeta) =>
      ((await ListCRD(kc, meta)).body as TAppCRList).items || [];

    const defaultArr = (await getRawAppList(getMeta()))
      .map<TAppConfig>((item) => {
        return { key: `system-${item.metadata.name}`, ...item.spec };
      })
      .sort((a, b) => {
        if (a.displayType === 'more' && b.displayType !== 'more') {
          return 1;
        } else if (a.displayType !== 'more' && b.displayType === 'more') {
          return -1;
        } else {
          return 0;
        }
      });

    const userArr = (await getRawAppList(getMeta(payload.workspaceId))).map<TAppConfig>((item) => {
      return { key: `user-${item.metadata.name}`, ...item.spec, displayType: 'normal' };
    });

    let apps = [...defaultArr, ...userArr].filter((item) => item.displayType !== 'hidden');

    jsonRes(res, { data: apps });
  } catch (err) {
    console.log(err);
    jsonRes(res, { code: 500, data: err });
  }
}
