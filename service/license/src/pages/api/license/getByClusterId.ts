import { authSession } from '@/services/backend/auth';
import { getLicenseRecordsByUidAndClusterId } from '@/services/backend/db/license';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });

    const { clusterId } = req.body;
    if (!clusterId) {
      return jsonRes(res, { code: 400, message: 'Request parameter error' });
    }

    const { page = 1, pageSize = 10 } = req.body as {
      page: number;
      pageSize: number;
    };

    const result = await getLicenseRecordsByUidAndClusterId({
      uid: payload.uid,
      page: page,
      pageSize: pageSize,
      clusterId: clusterId
    });

    return jsonRes(res, {
      data: result
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
