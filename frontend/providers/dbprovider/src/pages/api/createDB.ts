import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { KbPgClusterType } from '@/types/cluster';
import {
  BackupItemType,
  DBEditType,
  CPUResourceEnum,
  MemoryResourceEnum,
  ReplicasResourceEnum
} from '@/types/db';
import { json2Account, json2ResourceOps, json2CreateCluster } from '@/utils/json2Yaml';
import type { NextApiRequest, NextApiResponse } from 'next';
import { updateBackupPolicyApi } from './backup/updatePolicy';
import { BackupSupportedDBTypeList } from '@/constants/db';
import { adaptDBDetail, convertBackupFormToSpec } from '@/utils/adapt';
import { CustomObjectsApi, PatchUtils } from '@kubernetes/client-node';
import { createDatabaseSchemas } from '@/types/apis';
import { z } from 'zod';

// Resource conversion utilities
const resourceConverters = {
  // Convert CPU cores to millicores (e.g., 1 -> 1000, 0.5 -> 500)
  cpuToMillicores: (cores: number): number => cores * 1000,

  // Convert GB to MB (e.g., 1 -> 1024, 0.5 -> 512)
  memoryToMB: (gb: number): number => gb * 1024
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { type, version, name, resource, terminationPolicy, autoBackup, isEdit, backupInfo } =
      req.body as z.Infer<typeof createDatabaseSchemas.body> & {
        isEdit: boolean;
        backupInfo?: BackupItemType;
        autoBackup?: any;
      };

    const dbForm: DBEditType = {
      dbType: type as any,
      dbVersion: version,
      dbName: name,
      replicas: resource.replicas,
      // Convert CPU from cores to millicores
      cpu: resourceConverters.cpuToMillicores(resource.cpu),
      // Convert memory from GB to MB
      memory: resourceConverters.memoryToMB(resource.memory),
      storage: resource.storage,
      labels: {},
      terminationPolicy: terminationPolicy as any,
      autoBackup: autoBackup || {
        start: true,
        type: 'day',
        week: [],
        hour: '12',
        minute: '00',
        saveTime: 100,
        saveType: 'd'
      }
    };

    const { k8sCustomObjects, namespace, applyYamlList } = await getK8s({
      kubeconfig: await authSession(req)
    });

    if (isEdit) {
      const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
        'apps.kubeblocks.io',
        'v1alpha1',
        namespace,
        'clusters',
        name
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
    }

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
    const dbName = body.metadata.name;

    const updateAccountYaml = json2Account(dbForm, dbUid);

    await applyYamlList([updateAccountYaml], 'replace');

    try {
      if (BackupSupportedDBTypeList.includes(dbForm.dbType)) {
        const autoBackup = convertBackupFormToSpec({
          autoBackup: dbForm.autoBackup,
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
