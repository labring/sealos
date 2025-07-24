import { BackupSupportedDBTypeList } from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { KbPgClusterType } from '@/types/cluster';
import { DBEditType, BackupItemType } from '@/types/db';
import { convertBackupFormToSpec } from '@/utils/adapt';
import { json2Account, json2CreateCluster } from '@/utils/json2Yaml';
import { NextApiRequest, NextApiResponse } from 'next';
import { updateBackupPolicyApi } from '../backup/updatePolicy';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { dbForm, backupInfo } = req.body as {
        dbForm: DBEditType;
        backupInfo?: BackupItemType;
      };

      const { k8sCustomObjects, namespace, applyYamlList } = await getK8s({
        kubeconfig: await authSession(req)
      });

      const account = json2Account(dbForm);
      const cluster = json2CreateCluster(dbForm, backupInfo, {
        storageClassName: process.env.STORAGE_CLASSNAME
      });

      await applyYamlList([account, cluster], 'create');
      const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
        'apps.kubeblocks.io',
        'v1alpha1',
        namespace,
        'clusters',
        dbForm.dbName
      )) as {
        body: KbPgClusterType;
      };
      const dbUid = body.metadata.uid;

      const updateAccountYaml = json2Account(dbForm, dbUid);

      await applyYamlList([updateAccountYaml], 'replace');

      try {
        if (BackupSupportedDBTypeList.includes(dbForm.dbType) && dbForm?.autoBackup) {
          const autoBackup = convertBackupFormToSpec({
            autoBackup: dbForm?.autoBackup,
            dbType: dbForm.dbType
          });

          await updateBackupPolicyApi({
            dbName: dbForm.dbName,
            dbType: dbForm.dbType,
            autoBackup,
            k8sCustomObjects,
            namespace
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
