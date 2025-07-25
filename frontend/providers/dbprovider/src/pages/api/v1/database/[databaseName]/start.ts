import { getCluster } from '@/pages/api/getDBByName';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { startDatabaseSchemas } from '@/types/apis';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { json2BasicOps } from '@/utils/json2Yaml';
import { PatchUtils } from '@kubernetes/client-node';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const kubeconfig = await authSession(req).catch(() => null);
  if (!kubeconfig) {
    return jsonRes(res, {
      code: ResponseCode.UNAUTHORIZED,
      message: ResponseMessages[ResponseCode.UNAUTHORIZED]
    });
  }

  const k8s = await getK8s({ kubeconfig }).catch(() => null);
  if (!k8s) {
    return jsonRes(res, {
      code: ResponseCode.UNAUTHORIZED,
      message: ResponseMessages[ResponseCode.UNAUTHORIZED]
    });
  }

  if (req.method === 'POST') {
    try {
      const pathParamsParseResult = startDatabaseSchemas.pathParams.safeParse(req.query);
      if (!pathParamsParseResult.success) {
        return jsonRes(res, {
          code: 400,
          message: 'Invalid request params.',
          error: pathParamsParseResult.error.issues
        });
      }

      const dbName = pathParamsParseResult.data.databaseName;

      const body = await getCluster(req, dbName);
      if (body.spec.backup?.enabled === false) {
        const patch = [
          {
            op: 'replace',
            path: '/spec/backup/enabled',
            value: true
          }
        ];

        await k8s.k8sCustomObjects.patchNamespacedCustomObject(
          'apps.kubeblocks.io',
          'v1alpha1',
          k8s.namespace,
          'clusters',
          dbName,
          patch,
          undefined,
          undefined,
          undefined,
          { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH } }
        );
      }

      const yaml = json2BasicOps({
        dbName,
        type: 'Start'
      });
      await k8s.applyYamlList([yaml], 'update');

      return jsonRes(res, { data: 'start success' });
    } catch (error) {
      return jsonRes(res, {
        code: 500,
        error: error
      });
    }
  }

  return jsonRes(res, {
    code: 405,
    message: 'Method not allowed'
  });
}
