import { authSession } from '@/services/backend/auth';
import { isKubeSystemIDBound } from '@/services/backend/db/cluster';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userInfo = await authSession(req.headers);
    if (!userInfo) return jsonRes(res, { code: 401, message: 'token verify error' });

    const { kubeSystemID } = req.query as {
      kubeSystemID: string;
    };

    const isBound = await isKubeSystemIDBound(kubeSystemID);
    console.log(isBound, 'isBound');

    return jsonRes(res, {
      data: {
        isBound: isBound
      }
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
