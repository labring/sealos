import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { CloudMigraionLabel } from '@/constants/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name } = req.query as { name: string };
    if (!name) {
      throw new Error('name is empty');
    }

    const result = await DeleteJobByName({ name, req });

    jsonRes(res, { code: 200, data: result });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export async function GetJobByName({ name, req }: { name: string } & { req: NextApiRequest }) {
  const { k8sBatch, namespace } = await getK8s({
    kubeconfig: await authSession(req)
  });
  const { body: data } = await k8sBatch.listNamespacedJob(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    `${CloudMigraionLabel}=${name}`
  );
  return data.items;
}

export async function DeleteJobByName({ name, req }: { name: string } & { req: NextApiRequest }) {
  const { k8sBatch, namespace } = await getK8s({
    kubeconfig: await authSession(req)
  });
  return await k8sBatch.deleteNamespacedJob(
    name,
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    'Background'
  );
}
