import { AuthAdmin, authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { ns } = req.query as {
      ns: string;
    };
    const { namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const isAdmin = AuthAdmin(ns || namespace);

    return jsonRes(res, {
      data: isAdmin
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
