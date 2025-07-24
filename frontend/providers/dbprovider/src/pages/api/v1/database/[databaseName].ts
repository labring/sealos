import { BackupSupportedDBTypeList } from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { KbPgClusterType } from '@/types/cluster';
import { adaptDBDetail, convertBackupFormToSpec } from '@/utils/adapt';
import { json2ResourceOps } from '@/utils/json2Yaml';
import { NextApiRequest, NextApiResponse } from 'next';
import { updateBackupPolicyApi } from '../../backup/updatePolicy';
import { updateTerminationPolicyApi } from '../../createDB';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { updateDatabaseSchemas } from '@/types/apis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const kubeconfig = await authSession(req).catch(() => null);

  if (!kubeconfig) {
    return jsonRes(res, {
      code: ResponseCode.UNAUTHORIZED,
      message: ResponseMessages[ResponseCode.UNAUTHORIZED]
    });
  }

  const k8s = await getK8s({
    kubeconfig
  }).catch(() => null);

  if (!k8s) {
    return jsonRes(res, {
      code: ResponseCode.UNAUTHORIZED,
      message: ResponseMessages[ResponseCode.UNAUTHORIZED]
    });
  }

  if (req.method === 'PATCH') {
    try {
      const pathParamsParseResult = updateDatabaseSchemas.pathParams.safeParse(req.query);
      if (!pathParamsParseResult.success) {
        return jsonRes(res, {
          code: 400,
          message: 'Invalid request params.',
          error: pathParamsParseResult.error.issues
        });
      }

      const bodyParseResult = updateDatabaseSchemas.body.safeParse(req.body);
      if (!bodyParseResult.success) {
        return jsonRes(res, {
          code: 400,
          message: 'Invalid request body.',
          error: bodyParseResult.error.issues
        });
      }

      const reqPathParams = pathParamsParseResult.data;
      const reqBody = bodyParseResult.data;

      const { body } = (await k8s.k8sCustomObjects.getNamespacedCustomObject(
        'apps.kubeblocks.io',
        'v1alpha1',
        k8s.namespace,
        'clusters',
        reqPathParams.databaseName
      )) as {
        body: KbPgClusterType;
      };
      const existingDatabase = adaptDBDetail(body);
      const mergedDatabase = {
        ...existingDatabase,
        ...reqBody.dbForm
      };

      const opsRequests = [];

      if (
        existingDatabase.cpu !== mergedDatabase.cpu ||
        existingDatabase.memory !== mergedDatabase.memory
      ) {
        const verticalScalingYaml = json2ResourceOps(mergedDatabase, 'VerticalScaling');
        opsRequests.push(verticalScalingYaml);
      }

      if (existingDatabase.replicas !== mergedDatabase.replicas) {
        const horizontalScalingYaml = json2ResourceOps(mergedDatabase, 'HorizontalScaling');
        opsRequests.push(horizontalScalingYaml);
      }

      if (mergedDatabase.storage > existingDatabase.storage) {
        const volumeExpansionYaml = json2ResourceOps(mergedDatabase, 'VolumeExpansion');
        opsRequests.push(volumeExpansionYaml);
      }

      console.log({ opsRequests });

      if (opsRequests.length > 0) {
        await k8s.applyYamlList(opsRequests, 'create');
      }

      if (BackupSupportedDBTypeList.includes(mergedDatabase.dbType) && mergedDatabase?.autoBackup) {
        const autoBackup = convertBackupFormToSpec({
          autoBackup: mergedDatabase?.autoBackup,
          dbType: mergedDatabase.dbType
        });

        await updateBackupPolicyApi({
          dbName: mergedDatabase.dbName,
          dbType: mergedDatabase.dbType,
          autoBackup,
          k8sCustomObjects: k8s.k8sCustomObjects,
          namespace: k8s.namespace
        });

        if (existingDatabase.terminationPolicy !== mergedDatabase.terminationPolicy) {
          await updateTerminationPolicyApi({
            dbName: mergedDatabase.dbName,
            terminationPolicy: mergedDatabase.terminationPolicy,
            k8sCustomObjects: k8s.k8sCustomObjects,
            namespace: k8s.namespace
          });
        }
      }

      return jsonRes(res, {
        data: `Successfully submitted ${opsRequests.length} change requests`
      });
    } catch (err) {
      console.log('error create db', err);
      jsonRes(res, handleK8sError(err));
    }
  }

  return jsonRes(res, {
    code: 405,
    message: 'Method not allowed'
  });
}
