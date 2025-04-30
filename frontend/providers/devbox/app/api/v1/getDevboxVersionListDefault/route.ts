import { NextRequest } from 'next/server';

import { KBDevboxReleaseType } from '@/types/k8s';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { RequestSchema } from './schema';
import { adaptDevboxVersionListItem } from '@/utils/adapt';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const devboxName = searchParams.get('devboxName');
    const headerList = req.headers;

    const validationResult = RequestSchema.safeParse({
      devboxName
    });

    if (!validationResult.success) {
      return jsonRes({
        code: 400,
        message: 'Invalid request parameters',
        error: validationResult.error.errors
      });
    }

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
      return item.spec && item.spec.devboxName === devboxName;
    });

    const adaptedVersions = matchingDevboxVersions.map(adaptDevboxVersionListItem).sort((a, b) => {
      return new Date(b.createTime).getTime() - new Date(a.createTime).getTime();
    });

    return jsonRes({ data: adaptedVersions });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error',
      error: err
    });
  }
}
