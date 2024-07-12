import { K8sApiDefault } from '@/services/backend/kubernetes/admin';
import { UpdateCRD } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountMeta } from './getAccount';
import { GUIDE_DESKTOP_INDEX_KEY } from '@/constants/account';
import { verifyAccessToken } from '@/services/backend/auth';

// req header is kubeconfig
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token is vaild' });

    const defaultKc = K8sApiDefault();

    if (!defaultKc) return jsonRes(res, { code: 401, message: 'No cluster permissions' });

    const endTime = new Date().toISOString();

    const jsonPatch = [
      {
        op: 'add',
        path: `/metadata/annotations/${GUIDE_DESKTOP_INDEX_KEY}`,
        value: endTime
      }
    ];

    const reuslt = await UpdateCRD(defaultKc, AccountMeta, payload.userCrName, jsonPatch);

    jsonRes(res, { data: reuslt?.body });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
