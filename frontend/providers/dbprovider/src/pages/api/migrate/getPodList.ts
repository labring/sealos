import { KBMigrationTaskLabel, SealosMigrationTaskLabel } from '@/constants/db';
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

    const { k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const response = await k8sCore.listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      migrateType === 'network'
        ? `${KBMigrationTaskLabel}=${migrateName}`
        : `job-name=${migrateName}`
    );

    return jsonRes(res, {
      data: response.body.items
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
