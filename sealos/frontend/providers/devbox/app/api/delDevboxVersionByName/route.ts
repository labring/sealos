import { NextRequest } from 'next/server';

import { ApiResp } from '@/services/kubernet';
import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const versionName = searchParams.get('versionName') as string;
    const headerList = req.headers;

    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    await k8sCustomObjects.deleteNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxreleases',
      versionName
    );

    return jsonRes({
      data: 'success delete devbox version'
    });
  } catch (err: any) {
    return jsonRes<ApiResp>({
      code: 500,
      error: err
    });
  }
}
