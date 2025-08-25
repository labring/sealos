import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { lauchpadRemarkKey } from '@/constants/account';
import { PatchUtils } from '@kubernetes/client-node';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { appName, remark, kind } = req.body as {
      appName: string;
      remark: string;
      kind: 'deployment' | 'statefulset';
    };

    if (!appName || !kind || !remark) {
      throw new Error('appName or kind or remark is empty');
    }

    if (remark.length > 60) {
      throw new Error('remark length cannot exceed 60 characters');
    }

    const { k8sApp, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const patchData = {
      metadata: {
        annotations: {
          [lauchpadRemarkKey]: remark || ''
        }
      }
    };

    const options = {
      headers: { 'Content-type': PatchUtils.PATCH_FORMAT_STRATEGIC_MERGE_PATCH }
    };

    if (kind === 'statefulset') {
      await k8sApp.patchNamespacedStatefulSet(
        appName,
        namespace,
        patchData,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        options
      );
    } else {
      await k8sApp.patchNamespacedDeployment(
        appName,
        namespace,
        patchData,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        options
      );
    }

    jsonRes(res, { data: 'success' });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
