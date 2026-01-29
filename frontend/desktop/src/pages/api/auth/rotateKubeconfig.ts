import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { verifyAccessToken } from '@/services/backend/auth';
import { K8sApiDefault } from '@/services/backend/kubernetes/admin';
import * as k8s from '@kubernetes/client-node';
import { k8sRFC3339Time } from '@/utils/format';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';

/**
 * Rotate kubeconfig by setting kubeConfigRotateAt timestamp
 * This triggers the backend to generate a new kubeconfig
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const regionUser = await verifyAccessToken(req.headers);
    if (!regionUser) {
      return jsonRes(res, {
        code: 401,
        message: 'invalid token'
      });
    }

    const kc = K8sApiDefault();
    const group = 'user.sealos.io';
    const version = 'v1';
    const plural = 'users';
    const k8s_username = regionUser.userCrName;

    const client = kc.makeApiClient(k8s.CustomObjectsApi);
    const rotateTime = k8sRFC3339Time(new Date());

    // Patch user spec with kubeConfigRotateAt to trigger rotation
    const patches = [
      {
        op: 'add',
        path: '/spec/kubeConfigRotateAt',
        value: rotateTime
      }
    ];

    await client.patchClusterCustomObject(
      group,
      version,
      plural,
      k8s_username,
      patches,
      undefined,
      undefined,
      undefined,
      {
        headers: {
          'Content-Type': 'application/json-patch+json'
        }
      }
    );

    // Wait for the new kubeconfig to be generated
    const newKubeconfig = await watchKubeconfigUpdate(kc, group, version, plural, k8s_username);

    if (!newKubeconfig) {
      throw new Error('Failed to get updated kubeconfig');
    }

    // Switch namespace to user's workspace
    const kubeconfig = switchKubeconfigNamespace(newKubeconfig, regionUser.workspaceId);

    return jsonRes(res, {
      code: 200,
      message: 'Kubeconfig rotated successfully',
      data: {
        kubeconfig
      }
    });
  } catch (err: any) {
    console.error('Failed to rotate kubeconfig:', err);
    return jsonRes(res, {
      message: err?.message || 'Failed to rotate kubeconfig',
      code: 500
    });
  }
}

/**
 * Watch for kubeconfig update after rotation
 */
async function watchKubeconfigUpdate(
  kc: k8s.KubeConfig,
  group: string,
  version: string,
  plural: string,
  name: string,
  interval = 1000,
  timeout = 15000
): Promise<string | null> {
  let lastKubeconfig: string | undefined;
  const startTime = Date.now();
  const client = kc.makeApiClient(k8s.CustomObjectsApi);

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, interval));

    try {
      const data = await client.getClusterCustomObjectStatus(group, version, plural, name);
      const body = data.body as any;

      if ('status' in body && 'kubeConfig' in body.status) {
        const currentKubeconfig = body.status.kubeConfig as string;

        // Check if kubeconfig has changed
        if (lastKubeconfig === undefined) {
          lastKubeconfig = currentKubeconfig;
        } else if (currentKubeconfig !== lastKubeconfig) {
          return currentKubeconfig;
        }
      }
    } catch (err) {
      console.error(`Failed to get status for ${name}:`, err);
    }

    if (Date.now() - startTime >= timeout) {
      console.error(`Timed out after ${timeout}ms waiting for kubeconfig update`);
      break;
    }
  }

  return null;
}
