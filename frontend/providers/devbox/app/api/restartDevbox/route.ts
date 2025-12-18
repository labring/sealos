import { NextRequest } from 'next/server';

import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { RequestSchema } from './schema';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validationResult = RequestSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonRes({
        code: 400,
        message: 'Invalid request body',
        error: validationResult.error.errors
      });
    }

    const { devboxName } = validationResult.data;
    const headerList = req.headers;

    const { namespace, k8sCore } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    // before restart = stopped + running
    // now restart = delete pods
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

    // Delete all pods
    await Promise.all(
      pods.map((pod) => k8sCore.deleteNamespacedPod(pod.metadata?.name || '', namespace))
    );

    return jsonRes({
      data: 'success restart devbox'
    });
  } catch (err: any) {
    return jsonRes({
      code: err?.statusCode || err?.response?.statusCode || 500,
      error: err
    });
  }
}
