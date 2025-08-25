import { NextRequest } from 'next/server';

import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { name, releaseDes } = (await req.json()) as { name: string; releaseDes: string };
    const headerList = req.headers;

    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    await k8sCustomObjects.patchNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxreleases',
      name,
      { spec: { notes: releaseDes } },
      undefined,
      undefined,
      undefined,
      {
        headers: {
          'Content-Type': 'application/merge-patch+json'
        }
      }
    );

    return jsonRes({
      data: 'success edit devbox version description'
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
