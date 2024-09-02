import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { appDeployKey } from '@/constants/app';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const apps = await GetApps({ req });

    jsonRes(res, { data: apps });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export async function GetApps({ req }: { req: NextApiRequest }) {
  const req_namespace = req.query.namespace as string;

  const { k8sApp, namespace } = await getK8s({
    kubeconfig: await authSession(req.headers)
  });

  const response = await Promise.allSettled([
    k8sApp.listNamespacedDeployment(
      req_namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      appDeployKey
    ),
    k8sApp.listNamespacedStatefulSet(
      req_namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      appDeployKey
    )
  ]);

  const apps = response
    .filter((item) => item.status === 'fulfilled')
    .map((item: any) => item?.value?.body?.items)
    .filter((item) => item)
    .flat();

  return apps;
}
