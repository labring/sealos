import { BackupSupportedDBTypeList } from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { KbPgClusterType } from '@/types/cluster';
import { DBEditType, BackupItemType } from '@/types/db';
import { adaptDBDetail, convertBackupFormToSpec } from '@/utils/adapt';
import { json2ResourceOps } from '@/utils/json2Yaml';
import { NextApiRequest, NextApiResponse } from 'next';
import { updateBackupPolicyApi } from '../../backup/updatePolicy';
import { updateTerminationPolicyApi } from '../../createDB';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'PATCH') {
    try {
      const { dbForm } = req.body as {
        dbForm: DBEditType;
      };

      const { k8sCustomObjects, namespace, applyYamlList } = await getK8s({
        kubeconfig: await authSession(req)
      });

      const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
        'apps.kubeblocks.io',
        'v1alpha1',
        namespace,
        'clusters',
        dbForm.dbName
      )) as {
        body: KbPgClusterType;
      };
      const { cpu, memory, replicas, storage, terminationPolicy } = adaptDBDetail(body);

      const opsRequests = [];

      if (cpu !== dbForm.cpu || memory !== dbForm.memory) {
        const verticalScalingYaml = json2ResourceOps(dbForm, 'VerticalScaling');
        opsRequests.push(verticalScalingYaml);
      }

      if (replicas !== dbForm.replicas) {
        const horizontalScalingYaml = json2ResourceOps(dbForm, 'HorizontalScaling');
        opsRequests.push(horizontalScalingYaml);
      }

      if (dbForm.storage > storage) {
        const volumeExpansionYaml = json2ResourceOps(dbForm, 'VolumeExpansion');
        opsRequests.push(volumeExpansionYaml);
      }

      if (opsRequests.length > 0) {
        await applyYamlList(opsRequests, 'create');
      }

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

        if (terminationPolicy !== dbForm.terminationPolicy) {
          await updateTerminationPolicyApi({
            dbName: dbForm.dbName,
            terminationPolicy: dbForm.terminationPolicy,
            k8sCustomObjects,
            namespace
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
