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

    const group = 'user.sealos.io';
    const version = 'v1';
    const plural = 'users';
    const k8s_username = regionUser.userCrName;

    // NOTE:
    // Rotating kubeconfig requires patching cluster-scoped User CR (`users.user.sealos.io`).
    // The current workspace kubeconfig is usually a namespaced ServiceAccount and may not have RBAC to patch cluster resources.
    // So we use the server's admin kubeconfig to perform the patch, and only switch the returned kubeconfig to workspace.
    const adminKc = K8sApiDefault();
    const client = adminKc.makeApiClient(k8s.CustomObjectsApi);
    const rotateTime = k8sRFC3339Time(new Date());

    // Capture kubeconfig BEFORE patch to avoid race:
    // if rotation completes before our first poll, we still detect the change.
    let previousKubeconfig: string | undefined;
    try {
      const pre = await client.getClusterCustomObjectStatus(group, version, plural, k8s_username);
      const preBody = pre.body as any;
      if (preBody?.status?.kubeConfig) {
        previousKubeconfig = preBody.status.kubeConfig as string;
      }
    } catch (err) {
      // Non-fatal: we can still poll for presence/change after patch.
      console.warn('Failed to read previous kubeconfig before rotation:', err);
    }

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
    const newKubeconfig = await watchKubeconfigUpdate(
      adminKc,
      group,
      version,
      plural,
      k8s_username,
      previousKubeconfig
    );

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
      message: err?.body?.message || err?.message || 'Failed to rotate kubeconfig',
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
  previousKubeconfig?: string,
  interval = 1000,
  timeout = 45000
): Promise<string | null> {
  let lastSeenPhase: string | undefined;
  let lastSeenMessage: string | undefined;
  const startTime = Date.now();
  const client = kc.makeApiClient(k8s.CustomObjectsApi);

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, interval));

    try {
      const data = await client.getClusterCustomObjectStatus(group, version, plural, name);
      const body = data.body as any;

      const phase = body?.status?.phase as string | undefined;
      const conds = body?.status?.conditions as any[] | undefined;
      const message =
        (Array.isArray(conds) && conds.length > 0 ? conds[conds.length - 1]?.message : undefined) ||
        undefined;

      if (phase && phase !== lastSeenPhase) lastSeenPhase = phase;
      if (message && message !== lastSeenMessage) lastSeenMessage = message;

      const currentKubeconfig = body?.status?.kubeConfig as string | undefined;
      if (currentKubeconfig) {
        if (previousKubeconfig === undefined) {
          // No baseline to compare, return the first kubeconfig we see.
          return currentKubeconfig;
        }
        if (currentKubeconfig !== previousKubeconfig) {
          return currentKubeconfig;
        }
      }
    } catch (err) {
      console.error(`Failed to get status for ${name}:`, err);
    }

    if (Date.now() - startTime >= timeout) {
      console.error(
        `Timed out after ${timeout}ms waiting for kubeconfig update` +
          (lastSeenPhase ? `; last phase=${lastSeenPhase}` : '') +
          (lastSeenMessage ? `; last message=${lastSeenMessage}` : '')
      );
      break;
    }
  }

  return null;
}
