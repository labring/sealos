import { NextRequest } from 'next/server';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { KBDevboxReleaseType } from '@/types/k8s';
import { json2DevboxRelease } from '@/utils/json2Yaml';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const releaseForm = (await req.json()) as {
      devboxName: string;
      tag: string;
      releaseDes: string;
      devboxUid: string;
    };
    const headerList = req.headers;

    const { applyYamlList, namespace, k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(headerList)
    });
    const { body: releaseBody } = (await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxreleases'
    )) as { body: { items: KBDevboxReleaseType[] } };
    if (
      releaseBody.items.some((item: any) => {
        return (
          item.spec &&
          item.spec.devboxName === releaseForm.devboxName &&
          item.metadata.ownerReferences[0].uid === releaseForm.devboxUid &&
          item.spec.newTag === releaseForm.tag
        );
      })
    ) {
      return jsonRes({
        code: 409,
        error: 'devbox release already exists'
      });
    }
    const devbox = json2DevboxRelease(releaseForm);
    await applyYamlList([devbox], 'create');

    return jsonRes({
      data: 'success create devbox release'
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
