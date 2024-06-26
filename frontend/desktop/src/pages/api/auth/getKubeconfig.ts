import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { getUserKubeconfigNotPatch } from '@/services/backend/kubernetes/admin';
import { verifyAccessToken } from '@/services/backend/auth';

import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const regionUser = await verifyAccessToken(req.headers);
    if (!regionUser)
      return jsonRes(res, {
        code: 401,
        message: 'invalid token'
      });
    const defaultKc = await getUserKubeconfigNotPatch(regionUser.userCrName);
    if (!defaultKc) throw new Error('get kubeconfig error, regionUserUid: ' + regionUser.userCrUid);
    const kubeconfig = switchKubeconfigNamespace(defaultKc, regionUser.workspaceId);
    return jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: {
        kubeconfig
      }
    });
  } catch (err) {
    console.log(err);
    return jsonRes(res, {
      message: 'Failed to get kubeconfig',
      code: 500
    });
  }
}
