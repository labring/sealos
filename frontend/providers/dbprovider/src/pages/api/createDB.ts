import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { KbPgClusterType } from '@/types/cluster';
import { BackupItemType, DBEditType } from '@/types/db';
import { json2Account, json2ClusterOps, json2CreateCluster } from '@/utils/json2Yaml';
import type { NextApiRequest, NextApiResponse } from 'next';
import { updateBackupPolicyApi } from './backup/updatePolicy';
import { BackupSupportedDBTypeList } from '@/constants/db';
import { convertBackupFormToSpec } from '@/utils/adapt';
import { CustomObjectsApi, PatchUtils } from '@kubernetes/client-node';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { dbForm, isEdit, backupInfo } = req.body as {
      dbForm: DBEditType;
      isEdit: boolean;
      backupInfo?: BackupItemType;
    };

    console.log(req.body, 'req.body');

    const { k8sCustomObjects, namespace, applyYamlList, delYamlList } = await getK8s({
      kubeconfig: await authSession(req)
    });

    if (isEdit) {
      const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
        'apps.kubeblocks.io',
        'v1alpha1',
        namespace,
        'clusters',
        dbForm.dbName
      )) as {
        body: KbPgClusterType;
      };

      const currentConfig = {
        cpu: parseInt(body.spec.componentSpecs[0].resources.limits.cpu.replace('m', '')),
        memory: parseInt(body.spec.componentSpecs[0].resources.limits.memory.replace('Mi', '')),
        replicas: body.spec.componentSpecs[0].replicas,
        storage: parseInt(
          body.spec.componentSpecs[0].volumeClaimTemplates[0].spec.resources.requests.storage.replace(
            'Gi',
            ''
          )
        ),
        terminationPolicy: body.spec.terminationPolicy
      };

      const opsRequests = [];

      if (currentConfig.cpu !== dbForm.cpu || currentConfig.memory !== dbForm.memory) {
        const verticalScalingYaml = json2ClusterOps(dbForm, 'VerticalScaling');
        opsRequests.push(verticalScalingYaml);
      }

      if (currentConfig.replicas !== dbForm.replicas) {
        const horizontalScalingYaml = json2ClusterOps(dbForm, 'HorizontalScaling');
        opsRequests.push(horizontalScalingYaml);
      }

      if (dbForm.storage > currentConfig.storage) {
        const volumeExpansionYaml = json2ClusterOps(dbForm, 'VolumeExpansion');
        opsRequests.push(volumeExpansionYaml);
      }

      console.log('DB Edit Operation:', {
        dbName: dbForm.dbName,
        changes: {
          cpu: currentConfig.cpu !== dbForm.cpu,
          memory: currentConfig.memory !== dbForm.memory,
          replicas: currentConfig.replicas !== dbForm.replicas,
          storage: dbForm.storage > currentConfig.storage
        },
        opsCount: opsRequests.length
      });

      if (opsRequests.length > 0) {
        await applyYamlList(opsRequests, 'create');
        return jsonRes(res, {
          data: `Successfully submitted ${opsRequests.length} change requests`
        });
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

        if (currentConfig.terminationPolicy !== dbForm.terminationPolicy) {
          await updateTerminationPolicyApi({
            dbName: dbForm.dbName,
            terminationPolicy: dbForm.terminationPolicy,
            k8sCustomObjects,
            namespace
          });
        }
      }

      return jsonRes(res, {
        data: 'success update db'
      });
    }

    const account = json2Account(dbForm);
    const cluster = json2CreateCluster(dbForm, backupInfo);
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
    const dbName = body.metadata.name;

    const updateAccountYaml = json2Account(dbForm, dbUid);

    await applyYamlList([updateAccountYaml], 'replace');

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

    jsonRes(res, {
      data: 'success create db'
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export async function updateTerminationPolicyApi({
  dbName,
  terminationPolicy,
  k8sCustomObjects,
  namespace
}: {
  dbName: string;
  terminationPolicy: string;
  k8sCustomObjects: CustomObjectsApi;
  namespace: string;
}) {
  const group = 'apps.kubeblocks.io';
  const version = 'v1alpha1';
  const plural = 'clusters';

  const patch = [
    {
      op: 'replace',
      path: '/spec/terminationPolicy',
      value: terminationPolicy
    }
  ];

  const result = await k8sCustomObjects.patchNamespacedCustomObject(
    group,
    version,
    namespace,
    plural,
    dbName,
    patch,
    undefined,
    undefined,
    undefined,
    { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH } }
  );

  return result;
}
