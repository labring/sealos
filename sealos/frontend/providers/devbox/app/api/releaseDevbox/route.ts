import { NextRequest } from 'next/server';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { KBDevboxReleaseType } from '@/types/k8s';
import { json2DevboxRelease } from '@/utils/json2Yaml';
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

    const releaseForm = validationResult.data;
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
        message: 'Devbox release already exists'
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
      message: err?.message || 'Internal server error',
      error: err
    });
  }
}
