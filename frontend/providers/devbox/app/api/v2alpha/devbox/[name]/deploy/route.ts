import { NextRequest, NextResponse } from 'next/server';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxIdKey } from '@/constants/devbox';
import { V1Deployment, V1StatefulSet } from '@kubernetes/client-node';

export const dynamic = 'force-dynamic';

function extractTagFromImage(image: string): string {
  const parts = image.split(':');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

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

    const { k8sApp, k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    let devboxUid: string;
    try {
      const { body: devboxBody } = (await k8sCustomObjects.getNamespacedCustomObject(
        'devbox.sealos.io',
        'v1alpha2',
        namespace,
        'devboxes',
        devboxName
      )) as { body: any };

      devboxUid = devboxBody.metadata?.uid;
      if (!devboxUid) {
        return jsonRes({
          code: 500,
          message: 'Devbox UID not found'
        });
      }
    } catch (err: any) {
      if (err.statusCode === 404 || err.response?.statusCode === 404) {
        return jsonRes({
          code: 404,
          message: 'Devbox not found'
        });
      }
      throw err;
    }

    const response = await Promise.allSettled([
      k8sApp.listNamespacedDeployment(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `${devboxIdKey}=${devboxUid}`
      ),
      k8sApp.listNamespacedStatefulSet(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `${devboxIdKey}=${devboxUid}`
      )
    ]);

    const deployments =
      response[0].status === 'fulfilled'
        ? (response[0].value.body.items as V1Deployment[])
        : [];
    const statefulSets =
      response[1].status === 'fulfilled'
        ? (response[1].value.body.items as V1StatefulSet[])
        : [];

    const deploymentItems = deployments.map((deployment) => {
      const image =
        deployment.metadata?.annotations?.originImageName ||
        deployment.spec?.template?.spec?.containers?.[0]?.image ||
        '';
      return {
        name: deployment.metadata?.name || '',
        resourceType: 'deployment' as const,
        tag: extractTagFromImage(image)
      };
    });

    const statefulSetItems = statefulSets.map((sts) => {
      const image =
        sts.metadata?.annotations?.originImageName ||
        sts.spec?.template?.spec?.containers?.[0]?.image ||
        '';
      return {
        name: sts.metadata?.name || '',
        resourceType: 'statefulset' as const,
        tag: extractTagFromImage(image)
      };
    });

    const allItems = [...deploymentItems, ...statefulSetItems];

    return NextResponse.json(allItems);
  } catch (err: any) {
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error',
      error: err
    });
  }
}

