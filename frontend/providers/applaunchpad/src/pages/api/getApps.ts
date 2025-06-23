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
  const { k8sApp, namespace } = await getK8s({
    kubeconfig: await authSession(req.headers)
  });

  const response = await Promise.allSettled([
    k8sApp.listNamespacedDeployment(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      appDeployKey
    ),
    k8sApp.listNamespacedStatefulSet(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      appDeployKey
    )
  ]);

  const deployments =
    response[0].status === 'fulfilled'
      ? response[0].value?.body?.items?.map((item: any) => ({
          ...item,
          kind: 'Deployment'
        })) || []
      : [];

  const statefulSets =
    response[1].status === 'fulfilled'
      ? response[1].value?.body?.items?.map((item: any) => ({
          ...item,
          kind: 'StatefulSet'
        })) || []
      : [];

  const apps = [...deployments, ...statefulSets];

  return apps;
}
