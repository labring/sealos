import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export type Props = {
  migrateName: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { migrateName } = req.query as Props;

  if (!migrateName) {
    return jsonRes(res, {
      code: 500,
      error: 'migrateName is empty'
    });
  }

  try {
    await delMigrateByName({
      migrateName,
      req
    });

    jsonRes(res);
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export async function delMigrateByName({ migrateName, req }: Props & { req: NextApiRequest }) {
  const group = 'datamigration.apecloud.io';
  const version = 'v1alpha1';
  const plural = 'migrationtasks';

  const { k8sCustomObjects, namespace } = await getK8s({
    kubeconfig: await authSession(req)
  });
  await k8sCustomObjects.deleteNamespacedCustomObject(
    group,
    version,
    namespace,
    plural,
    migrateName
  );
}
