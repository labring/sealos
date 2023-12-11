import { authSession } from '@/services/backend/auth';
import { K8sApiDefault } from '@/services/backend/kubernetes/admin';
import { UpdateCRD } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountMeta } from './getAccount';
import { GUIDE_DESKTOP_INDEX_KEY } from '@/constants/account';

// req header is kubeconfig
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
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

    const reuslt = await UpdateCRD(defaultKc, AccountMeta, payload.user.k8s_username, jsonPatch);

    jsonRes(res, { data: reuslt?.body });
  } catch (error) {
    console.log(error, 'get user account err');
    jsonRes(res, { code: 500, data: error });
  }
}
