import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { KbPgClusterType } from '@/types/cluster';
import { BackupItemType, DBEditType } from '@/types/db';
import {
  json2Account,
  json2ResourceOps,
  json2CreateCluster,
  json2ParameterConfig,
  json2Reconfigure
} from '@/utils/json2Yaml';
import type { NextApiRequest, NextApiResponse } from 'next';
import { updateBackupPolicyApi } from './backup/updatePolicy';
import { BackupSupportedDBTypeList } from '@/constants/db';
import { adaptDBDetail, convertBackupFormToSpec } from '@/utils/adapt';
import { CustomObjectsApi, KubernetesObject, PatchUtils } from '@kubernetes/client-node';
import { getScore } from '@/utils/tools';
import { validatePolarDBXResources } from '@/utils/database';
import {
  ensurePostgreSQLConfigSpec,
  getCurrentParameterValues,
  getParameterDifferences
} from '@/utils/parameterConfig';
import { createParameterHistory } from '@/utils/parameterHistory';
import type { ParameterDifference } from '@/utils/parameterChanges';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { dbForm, isEdit, backupInfo } = req.body as {
      dbForm: DBEditType;
      isEdit: boolean;
      backupInfo?: BackupItemType;
    };
    console.log('api createDB dbForm', dbForm);
    validatePolarDBXResources(dbForm);

    const { k8sCore, k8sCustomObjects, namespace, applyYamlList } = await getK8s({
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

      // Record parameter changes through OpsRequest so they appear in history.
      let parameterDifferencesForHistory: ParameterDifference[] | undefined;
      if (['postgresql', 'apecloud-mysql', 'mongodb', 'redis'].includes(dbForm.dbType)) {
        if (!(dbForm.dbType === 'apecloud-mysql' && dbForm.dbVersion === 'mysql-5.7.42')) {
          const dynamicMaxConnections = getScore(dbForm.dbType, dbForm.cpu, dbForm.memory);
          const currentParameterValues = await getCurrentParameterValues({
            dbName: dbForm.dbName,
            dbType: dbForm.dbType,
            namespace,
            k8sCore,
            k8sCustomObjects
          });
          const parameterDifferences = getParameterDifferences({
            dbType: dbForm.dbType,
            current: currentParameterValues,
            requested: dbForm.parameterConfig,
            dynamicMaxConnections
          });

          if (parameterDifferences.length > 0) {
            if (dbForm.dbType === 'postgresql') {
              await ensurePostgreSQLConfigSpec({
                dbName: dbForm.dbName,
                dbVersion: dbForm.dbVersion,
                namespace,
                k8sCustomObjects
              });
            }
            opsRequests.push(
              json2Reconfigure(
                dbForm.dbName,
                dbForm.dbType,
                body.metadata.uid,
                parameterDifferences
              )
            );
            parameterDifferencesForHistory = parameterDifferences;
          }
        }
      }

      if (opsRequests.length > 0) {
        const createdOpsRequests = await applyYamlList(opsRequests, 'create');
        if (parameterDifferencesForHistory) {
          const parameterOpsRequest = createdOpsRequests.find(
            (request) =>
              request?.kind === 'OpsRequest' &&
              Boolean(
                (request as KubernetesObject & { spec?: { reconfigure?: unknown } }).spec
                  ?.reconfigure
              )
          );
          try {
            await createParameterHistory({
              k8sCore,
              namespace,
              dbName: dbForm.dbName,
              dbType: dbForm.dbType,
              dbUid: body.metadata.uid,
              opsRequestName: parameterOpsRequest?.metadata?.name,
              differences: parameterDifferencesForHistory
            });
          } catch (error) {
            console.error('Failed to record parameter update history:', error);
          }
        }
      }

      if (
        process.env.BACKUP_ENABLED === 'true' &&
        BackupSupportedDBTypeList.includes(dbForm.dbType) &&
        dbForm?.autoBackup
      ) {
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
    }

    const account = json2Account(dbForm);
    const cluster = json2CreateCluster(dbForm, backupInfo, {
      storageClassName: process.env.STORAGE_CLASSNAME
    });

    const yamlList = [account, cluster];

    if (['postgresql', 'apecloud-mysql', 'mongodb', 'redis'].includes(dbForm.dbType)) {
      // MySQL 5.7.42 version should not apply parameter config
      if (!(dbForm.dbType === 'apecloud-mysql' && dbForm.dbVersion === 'mysql-5.7.42')) {
        const dynamicMaxConnections = getScore(dbForm.dbType, dbForm.cpu, dbForm.memory);

        const config = json2ParameterConfig(
          dbForm.dbName,
          dbForm.dbType,
          dbForm.dbVersion,
          dbForm.parameterConfig,
          dynamicMaxConnections
        );
        yamlList.unshift(config);
      }
    }

    await applyYamlList(yamlList, 'create');
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

    try {
      if (
        process.env.BACKUP_ENABLED === 'true' &&
        BackupSupportedDBTypeList.includes(dbForm.dbType) &&
        dbForm?.autoBackup
      ) {
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
