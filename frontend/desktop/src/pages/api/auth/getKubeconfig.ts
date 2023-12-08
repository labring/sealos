import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { getUserKubeconfig } from '@/services/backend/kubernetes/admin';
import { verifyAccessToken } from '@/services/backend/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const regionUser = await verifyAccessToken(req.headers);
    if (!regionUser)
      return jsonRes(res, {
        code: 401,
        message: 'invalid token'
      });
    const kubeconfig = await getUserKubeconfig(regionUser.userCrUid, regionUser.userCrName);
    if (!kubeconfig)
      throw new Error('get kubeconfig error, regionUserUid: ' + regionUser.userCrUid);
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
      message: 'Failed to authenticate with password',
      code: 500
    });
  }
}
