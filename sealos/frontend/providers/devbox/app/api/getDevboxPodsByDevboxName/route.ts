import { NextRequest } from 'next/server';

import { adaptPod } from '@/utils/adapt';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const devboxName = searchParams.get('name') as string;

    const headerList = req.headers;

    const { namespace, k8sCore } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    // get pods
    const {
      body: { items: pods }
    } = await k8sCore.listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `app.kubernetes.io/name=${devboxName}`
    );

    const adaptedPods = pods.map(adaptPod);

    return jsonRes({
      data: adaptedPods
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
