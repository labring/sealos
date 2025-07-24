import { BackupSupportedDBTypeList } from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { KbPgClusterType } from '@/types/cluster';
import { convertBackupFormToSpec } from '@/utils/adapt';
import { json2Account, json2CreateCluster } from '@/utils/json2Yaml';
import { NextApiRequest, NextApiResponse } from 'next';
import { updateBackupPolicyApi } from '../backup/updatePolicy';
import { createDatabaseSchemas } from '@/types/apis';
import { ResponseCode, ResponseMessages } from '@/types/response';

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

  if (req.method === 'POST') {
    try {
      const bodyParseResult = createDatabaseSchemas.body.safeParse(req.body);
      if (!bodyParseResult.success) {
        return jsonRes(res, {
          code: 400,
          message: 'Invalid request body.',
          error: bodyParseResult.error.issues
        });
      }

      const reqBody = bodyParseResult.data;

      const account = json2Account(reqBody.dbForm);
      const cluster = json2CreateCluster(reqBody.dbForm, reqBody.backupInfo, {
        storageClassName: process.env.STORAGE_CLASSNAME
      });

      await k8s.applyYamlList([account, cluster], 'create');
      const { body } = (await k8s.k8sCustomObjects.getNamespacedCustomObject(
        'apps.kubeblocks.io',
        'v1alpha1',
        k8s.namespace,
        'clusters',
        reqBody.dbForm.dbName
      )) as {
        body: KbPgClusterType;
      };
      const dbUid = body.metadata.uid;

      const updateAccountYaml = json2Account(reqBody.dbForm, dbUid);

      await k8s.applyYamlList([updateAccountYaml], 'replace');

      try {
        if (
          BackupSupportedDBTypeList.includes(reqBody.dbForm.dbType) &&
          reqBody.dbForm?.autoBackup
        ) {
          const autoBackup = convertBackupFormToSpec({
            autoBackup: reqBody.dbForm?.autoBackup,
            dbType: reqBody.dbForm.dbType
          });

          await updateBackupPolicyApi({
            dbName: reqBody.dbForm.dbName,
            dbType: reqBody.dbForm.dbType,
            autoBackup,
            k8sCustomObjects: k8s.k8sCustomObjects,
            namespace: k8s.namespace
          });
        }
      } catch (err: any) {
        // local env will fail to update backup policy
        if (process.env.NODE_ENV === 'production') {
          throw err;
        } else {
          console.log(err);
        }
      }

      jsonRes(res, {
        data: 'success create db'
      });
    } catch (err: any) {
      console.log('error create db', err);
      jsonRes(res, handleK8sError(err));
    }
  }

  return jsonRes(res, {
    code: 405,
    message: 'Method not allowed'
  });
}
