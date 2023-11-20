import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { CloudMigraionLabel } from '@/constants/db';

export type Props = {
  migrateName: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { migrateName } = req.query as Props;

    if (!migrateName) {
      return jsonRes(res, {
        code: 500,
        error: 'params error'
      });
    }

    jsonRes(res, {
      data: await getMigrateList({ migrateName, req })
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export async function getMigrateList({ migrateName, req }: Props & { req: NextApiRequest }) {
  const group = 'datamigration.apecloud.io';
  const version = 'v1alpha1';
  const plural = 'migrationtasks';

  const { k8sCustomObjects, namespace } = await getK8s({
    kubeconfig: await authSession(req)
  });

  const { body } = (await k8sCustomObjects.listNamespacedCustomObject(
    group,
    version,
    namespace,
    plural,
    undefined,
    undefined,
    undefined,
    undefined,
    `${CloudMigraionLabel}=${migrateName}`
  )) as { body: { items: any[] } };

  return body?.items || [];
}
