import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { crLabelKey } from '@/constants/db';

export type Props = {
  dbName: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { dbName } = req.query as Props;

  if (!dbName) {
    jsonRes(res, {
      code: 500,
      error: 'params error'
    });
    return;
  }

  try {
    jsonRes(res, {
      data: await getBackups({ dbName, req })
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export async function getBackups({ dbName, req }: Props & { req: NextApiRequest }) {
  const group = 'dataprotection.kubeblocks.io';
  const version = 'v1alpha1';
  const plural = 'backups';

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
    `app.kubernetes.io/instance=${dbName}`
  )) as { body: { items: any[] } };

  return body?.items || [];
}
