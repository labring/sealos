import { authSession } from '@/services/backend/auth';
import { deleteClusterRecord } from '@/services/backend/db/cluster';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userInfo = await authSession(req.headers);
    if (!userInfo) return jsonRes(res, { code: 401, message: 'token verify error' });

    const { clusterId } = req.query as { clusterId: string };
    if (!clusterId) {
      return jsonRes(res, { code: 400, message: 'ClusterId does not exist' });
    }

    const deleteResult = await deleteClusterRecord({
      uid: userInfo.uid,
      clusterId: clusterId
    });

    if (!deleteResult) {
      return jsonRes(res, { code: 404, message: 'Cluster not found' });
    }

    return jsonRes(res, {
      data: 'Cluster deleted successfully'
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
