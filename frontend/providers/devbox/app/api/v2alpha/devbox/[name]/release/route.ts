import { NextRequest, NextResponse } from 'next/server';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { KBDevboxReleaseType } from '@/types/k8s';
import { json2DevboxRelease } from '@/utils/json2Yaml';
import { adaptDevboxVersionListItem } from '@/utils/adapt';
import { RequestSchema } from './schema';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const devboxName = params.name;
    const headerList = req.headers;

    const devboxNamePattern = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    if (!devboxNamePattern.test(devboxName) || devboxName.length > 63) {
      return jsonRes({
        code: 400,
        message: 'Invalid devbox name format'
      });
    }

    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    const { body: devboxBody } = (await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxes'
    )) as { body: { items: any[] } };

    const devboxExists = devboxBody.items.some((item: any) => item?.metadata?.name === devboxName);
    if (!devboxExists) {
      return jsonRes({
        code: 404,
        message: 'Devbox not found'
      });
    }

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

    const { REGISTRY_ADDR } = process.env;

    const versionsWithImage = adaptedVersions.map((version) => {
      const { createTime, status, ...rest } = version as any;
      return {
        ...rest,
        createdAt: createTime,
        image: `${REGISTRY_ADDR}/${namespace}/${version.devboxName}:${version.tag}`
      };
    });

    return NextResponse.json(versionsWithImage);
  } catch (err: any) {
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error',
      error: err
    });
  }
}

export async function POST(req: NextRequest, { params }: { params: { name: string } }) {
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
    const devboxName = params.name;
    const headerList = req.headers;

    const devboxNamePattern = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    if (!devboxNamePattern.test(devboxName) || devboxName.length > 63) {
      return jsonRes({
        code: 400,
        message: 'Invalid devbox name format'
      });
    }

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

    const devbox = devboxBody.items.find((item: any) => item.metadata.name === devboxName);

    if (!devbox) {
      return jsonRes({
        code: 404,
        message: 'Devbox not found'
      });
    }

    if (
      releaseBody.items.some((item: any) => {
        return (
          item.spec && item.spec.devboxName === devboxName && item.spec.newTag === releaseForm.tag
        );
      })
    ) {
      return jsonRes({
        code: 409,
        message: 'Devbox release already exists'
      });
    }

    const devboxYaml = json2DevboxRelease({
      devboxName,
      tag: releaseForm.tag,
      releaseDes: releaseForm.releaseDes,
      devboxUid: devbox?.metadata.uid || '',
      startDevboxAfterRelease: false
    });
    await applyYamlList([devboxYaml], 'create');

    // Success: return 204 No Content
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error',
      error: err
    });
  }
}
