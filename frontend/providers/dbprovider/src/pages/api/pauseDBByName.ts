import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { KbPgClusterType } from '@/types/cluster';
import { json2StartOrStop } from '@/utils/json2Yaml';
import { PatchUtils } from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { dbName } = req.body as {
      dbName: string;
    };

    if (!dbName) {
      return jsonRes(res, {
        code: 400,
        error: 'params error'
      });
    }

    const { applyYamlList, k8sCustomObjects, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const { yaml, yamlObj } = json2StartOrStop({
      dbName,
      type: 'Stop'
    });

    const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      namespace,
      'clusters',
      dbName
    )) as {
      body: KbPgClusterType;
    };

    if (body.spec.backup?.enabled === true) {
      const patch = [
        {
          op: 'replace',
          path: '/spec/backup/enabled',
          value: false
        }
      ];
      await k8sCustomObjects.patchNamespacedCustomObject(
        'apps.kubeblocks.io',
        'v1alpha1',
        namespace,
        'clusters',
        dbName,
        patch,
        undefined,
        undefined,
        undefined,
        { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH } }
      );
    }

    await applyYamlList([yaml], 'update');

    jsonRes(res, { data: 'pause success' });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
