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

    const { body: devboxBody } = (await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxes'
    )) as { body: { items: KBDevboxReleaseType[] } };

    const devbox = devboxBody.items.find(
      (item: any) => item.metadata.name === releaseForm.devboxName
    );

    if (
      releaseBody.items.some((item: any) => {
        return (
          item.spec &&
          item.spec.devboxName === releaseForm.devboxName &&
          item.spec.newTag === releaseForm.tag
        );
      })
    ) {
      return jsonRes({
        code: 409,
        message: 'Devbox release already exists'
      });
    }

    const devboxYaml = json2DevboxRelease({
      ...releaseForm,
      devboxUid: devbox?.metadata.uid || ''
    });
    await applyYamlList([devboxYaml], 'create');

    const { REGISTRY_ADDR } = process.env;

    const imageName = `${REGISTRY_ADDR}/${namespace}/${releaseForm.devboxName}:${releaseForm.tag}`;

    return jsonRes({
      data: {
        devboxName: releaseForm.devboxName,
        tag: releaseForm.tag,
        image: imageName,
        releaseDes: releaseForm.releaseDes || '',
        createdAt: new Date().toISOString()
      }
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error',
      error: err
    });
  }
}
