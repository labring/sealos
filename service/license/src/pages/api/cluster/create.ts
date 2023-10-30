import { authSession } from '@/services/backend/auth';
import { createClusterRecord } from '@/services/backend/db/cluster';
import { jsonRes } from '@/services/backend/response';
import { ClusterType, CreateClusterParams } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { type = ClusterType.Standard } = req.body as CreateClusterParams;

    const userInfo = await authSession(req.headers);
    if (!userInfo) {
      return jsonRes(res, { code: 401, message: 'token verify error' });
    }

    const result = await createClusterRecord({
      uid: userInfo.uid,
      type: type
    });

    return jsonRes(res, {
      data: result
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
