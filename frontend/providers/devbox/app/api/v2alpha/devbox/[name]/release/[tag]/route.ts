import { NextRequest, NextResponse } from 'next/server';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { KBDevboxReleaseType } from '@/types/k8s';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: { name: string; tag: string } }) {
  try {
    const devboxName = params.name;
    const tag = params.tag;
    const headerList = req.headers;

    const devboxNamePattern = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    if (!devboxNamePattern.test(devboxName) || devboxName.length > 63) {
      return jsonRes({
        code: 400,
        message: 'Invalid devbox name format'
      });
    }


    if (!tag || tag.length === 0) {
      return jsonRes({
        code: 400,
        message: 'Tag is required'
      });
    }

    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    const { body: releaseBody } = (await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha2',
      namespace,
      'devboxreleases'
    )) as { body: { items: KBDevboxReleaseType[] } };

    const targetRelease = releaseBody.items.find((item: any) => {
      return (
        item.spec &&
        item.spec.devboxName === devboxName &&
        item.spec.version === tag
      );
    });

    if (!targetRelease) {
      return jsonRes({
        code: 404,
        message: 'Release not found'
      });
    }

    await k8sCustomObjects.deleteNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha2',
      namespace,
      'devboxreleases',
      targetRelease.metadata.name
    );

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error',
      error: err
    });
  }
}