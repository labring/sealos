import { NextRequest } from 'next/server';

import { devboxKey } from '@/constants/devbox';
import { jsonRes } from '@/services/backend/response';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { RequestSchema } from './schema';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const { name: devboxName } = params;

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

    const configMapResponse = (await k8sCore.listNamespacedConfigMap(
      namespace,
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
    const configMapList = configMapResponse.body.items;

    const pvcResponse = (await k8sCore.listNamespacedPersistentVolumeClaim(
      namespace,
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
    const pvcList = pvcResponse.body.items;

    const safeDelete = async (group: string, version: string, plural: string, name: string) => {
      try {
        await k8sCustomObjects.deleteNamespacedCustomObject(group, version, namespace, plural, name);
      } catch (err) {
        console.warn('Failed to delete an item, ignoring:', plural, name, err);
      }
    };

    const safeDeleteCore = async (deleteFunc: () => Promise<any>, resourceType: string, name: string) => {
      try {
        await deleteFunc();
      } catch (err) {
        console.warn('Failed to delete an item, ignoring:', resourceType, name, err);
      }
    };

    const deletePromises = [];

    if (ingressList.length > 0) {
      deletePromises.push(
        safeDeleteCore(
          () => k8sCore.deleteNamespacedService(devboxName, namespace),
          'service',
          devboxName
        )
      );

      ingressList.forEach((ingress: any) => {
        const networkName = ingress.metadata.name;
        deletePromises.push(
          safeDelete('networking.k8s.io', 'v1', 'ingresses', networkName),
          safeDelete('cert-manager.io', 'v1', 'issuers', networkName),
          safeDelete('cert-manager.io', 'v1', 'certificates', networkName)
        );
      });
    }

    configMapList.forEach((cm: any) => {
      const cmName = cm.metadata.name;
      deletePromises.push(
        safeDeleteCore(
          () => k8sCore.deleteNamespacedConfigMap(cmName, namespace),
          'configmap',
          cmName
        )
      );
    });

    pvcList.forEach((pvc: any) => {
      const pvcName = pvc.metadata.name;
      deletePromises.push(
        safeDeleteCore(
          () => k8sCore.deleteNamespacedPersistentVolumeClaim(pvcName, namespace),
          'pvc',
          pvcName
        )
      );
    });

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
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
