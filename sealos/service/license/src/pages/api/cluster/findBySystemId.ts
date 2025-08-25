import { authSession } from '@/services/backend/auth';
import { findClusterByUIDAndSystemId } from '@/services/backend/db/cluster';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { systemId } = req.query as { systemId: string };
    const userInfo = await authSession(req.headers);
    if (!userInfo) return jsonRes(res, { code: 401, message: 'token verify error' });

    const cluster = await findClusterByUIDAndSystemId({
      uid: userInfo.uid,
      systemId: systemId
    });

    return jsonRes(res, {
      data: cluster
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
