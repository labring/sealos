import { NextRequest } from 'next/server';

import { KBDevboxReleaseType } from '@/types/k8s';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const devboxName = searchParams.get('devboxName');
    const devboxUid = searchParams.get('devboxUid');
    const headerList = req.headers;

    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    const { body: releaseBody } = (await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxreleases'
    )) as { body: { items: KBDevboxReleaseType[] } };

    const matchingDevboxVersions = releaseBody.items.filter((item: any) => {
      return (
        item.spec &&
        item.spec.devboxName === devboxName &&
        item.metadata.ownerReferences[0].uid === devboxUid
      );
    });

    return jsonRes({ data: matchingDevboxVersions });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
