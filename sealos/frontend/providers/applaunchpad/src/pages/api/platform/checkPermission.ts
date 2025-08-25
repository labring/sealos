import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import * as k8s from '@kubernetes/client-node';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { appName } = req.query as { appName: string };
    if (!appName) throw new Error('appName is empty');

    const { k8sApp, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const patchBody = {
      metadata: {
        annotations: {
          'update-time': new Date().toISOString()
        }
      }
    };

    const options = {
      headers: { 'Content-type': k8s.PatchUtils.PATCH_FORMAT_STRATEGIC_MERGE_PATCH }
    };

    let deploymentUpdated = false;

    try {
      await k8sApp.patchNamespacedDeployment(
        appName,
        namespace,
        patchBody,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        options
      );
      deploymentUpdated = true;
    } catch (deployErr: any) {
      if (deployErr?.response?.statusCode !== 404) {
        throw deployErr;
      }
    }

    if (!deploymentUpdated) {
      await k8sApp.patchNamespacedStatefulSet(
        appName,
        namespace,
        patchBody,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        options
      );
    }

    jsonRes(res, { code: 200, data: 'success' });
  } catch (err: any) {
    if (err?.body?.code === 403 && err?.body?.message.includes('40001')) {
      return jsonRes(res, {
        code: 200,
        data: 'insufficient_funds',
        message: err.body.message
      });
    }

    jsonRes(res, {
      code: 500,
      error: err?.body || err?.message
    });
  }
}
