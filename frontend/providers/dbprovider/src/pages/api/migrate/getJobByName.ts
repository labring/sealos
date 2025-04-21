import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { migrateName, migrateType } = req.query as {
      migrateName: string;
      migrateType: 'network' | 'file';
    };

    const { k8sBatch, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    console.log(migrateName, migrateType);
    const { body: data } = await k8sBatch.readNamespacedJobStatus(migrateName, namespace);

    return jsonRes(res, {
      data: data.status
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
