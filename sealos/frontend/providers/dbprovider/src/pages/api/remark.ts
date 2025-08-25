import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { PatchUtils } from '@kubernetes/client-node';
import { DB_REMARK_KEY } from '@/constants/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { dbName, remark } = req.body as {
      dbName: string;
      remark: string;
    };

    if (!dbName) {
      throw new Error('dbName is empty');
    }

    if (remark.length > 60) {
      throw new Error('remark length cannot exceed 60 characters');
    }

    const { k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const patchData = {
      metadata: {
        annotations: {
          [DB_REMARK_KEY]: remark || ''
        }
      }
    };

    const options = {
      headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH }
    };

    await k8sCustomObjects.patchNamespacedCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      namespace,
      'clusters',
      dbName,
      patchData,
      undefined,
      undefined,
      undefined,
      options
    );

    jsonRes(res, { data: 'success' });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
