import { NextRequest } from 'next/server';

import { devboxKey } from '@/constants/devbox';
import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { RequestSchema } from './schema';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const devboxName = searchParams.get('devboxName');

    if (!devboxName) {
      return jsonRes({
        code: 400,
        message: 'Devbox name is required'
      });
    }

    const validationResult = RequestSchema.safeParse({ devboxName });

    if (!validationResult.success) {
      return jsonRes({
        code: 400,
        message: 'Invalid request parameters',
        error: validationResult.error.errors
      });
    }

    const headerList = req.headers;

    const { k8sCustomObjects, k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    await k8sCustomObjects.deleteNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxes',
      devboxName
    );

    const ingressResponse = (await k8sCustomObjects.listNamespacedCustomObject(
      'networking.k8s.io',
      'v1',
      namespace,
      'ingresses',
      undefined,
      undefined,
      undefined,
      undefined,
      `${devboxKey}=${devboxName}`
    )) as {
      body: {
        items: any[];
      };
    };

    const ingressList = ingressResponse.body.items;

    // delete service and ingress at the same time
    if (ingressList.length > 0) {
      const deleteServicePromise = k8sCore.deleteNamespacedService(devboxName, namespace);

      const deletePromises = ingressList.map(async (ingress: any) => {
        const networkName = ingress.metadata.name;

        const safeDelete = async (group: string, version: string, plural: string, name: string) => {
          try {
            await k8sCustomObjects.deleteNamespacedCustomObject(
              group,
              version,
              namespace,
              plural,
              name
            );
          } catch (err) {
            console.warn('Failed to delete an item, ignoring:', plural, name, err);
          }
        };

        return Promise.all([
          safeDelete('networking.k8s.io', 'v1', 'ingresses', networkName),
          // this two muse have customDomain
          safeDelete('cert-manager.io', 'v1', 'issuers', networkName),
          safeDelete('cert-manager.io', 'v1', 'certificates', networkName)
        ]);
      });

      await Promise.all([deleteServicePromise, ...deletePromises]);
    }

    return jsonRes({
      data: 'success delete devbox'
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error',
      error: err
    });
  }
}
