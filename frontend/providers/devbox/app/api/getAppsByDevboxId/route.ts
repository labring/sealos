import type { NextRequest } from 'next/server';

import { devboxIdKey } from '@/constants/devbox';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const apps = await getApps(req);
    return jsonRes({ data: apps });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}

async function getApps(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const devboxId = searchParams.get('devboxId') as string;

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
      `${devboxIdKey}=${devboxId}`
    ),
    k8sApp.listNamespacedStatefulSet(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `${devboxIdKey}=${devboxId}`
    )
  ]);
  const apps = response
    .filter((item) => item.status === 'fulfilled')
    .map((item: any) => item?.value?.body?.items)
    .filter((item) => item)
    .flat();
  return apps;
}
