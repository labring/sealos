import { authSession } from '@/services/backend/auth';
import { findClusterByUIDAndClusterID } from '@/services/backend/db/cluster';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { clusterId } = req.query as { clusterId: string };
    const userInfo = await authSession(req.headers);
    if (!userInfo) return jsonRes(res, { code: 401, message: 'token verify error' });

    const cluster = await findClusterByUIDAndClusterID({
      uid: userInfo.uid,
      clusterId: clusterId
    });

    return jsonRes(res, {
      data: cluster
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
