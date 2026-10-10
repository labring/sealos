import { json2ResourceOps } from '@/utils/json2Yaml';
import { adaptDBDetail, getDatabaseResourceComponentSpec } from '@/utils/adapt';
import { KbPgClusterType } from '@/types/cluster';
import { updateDatabaseSchemas } from '@/types/apis/v2alpha';
import z from 'zod';
import { getK8s } from '../kubernetes';
import * as yaml from 'js-yaml';

const schema2Raw = (currentData: any, updateQuota: any) => {
  const resources = {
    cpu: updateQuota.cpu !== undefined ? updateQuota.cpu * 1000 : currentData.cpu,
    memory: updateQuota.memory !== undefined ? updateQuota.memory * 1024 : currentData.memory,
    storage: updateQuota.storage !== undefined ? updateQuota.storage : currentData.storage,
    replicas: updateQuota.replicas !== undefined ? updateQuota.replicas : currentData.replicas
  };

  return {
    ...currentData,
    cpu: resources.cpu,
    memory: resources.memory,
    storage: resources.storage,
    replicas: resources.replicas
  };
};

const raw2Schema = (rawDbDetail: any) => {
  const finalCpu = rawDbDetail.cpu / 1000;
  const finalMemory = rawDbDetail.memory / 1024;
  const finalStorage = rawDbDetail.storage;
  const finalReplicas = rawDbDetail.replicas;

  const convertedData = {
    id: rawDbDetail.id,
    name: rawDbDetail.dbName || rawDbDetail.name,
    dbType: rawDbDetail.dbType,
    dbVersion: rawDbDetail.dbVersion,
    status: rawDbDetail.status,
    createTime: rawDbDetail.createTime,

    quota: {
      cpu: finalCpu,
      memory: finalMemory,
      storage: finalStorage,
      replicas: finalReplicas
    },

    cpu: finalCpu,
    memory: finalMemory,
    storage: finalStorage,
    replicas: finalReplicas,

    totalResource: {
      cpu: rawDbDetail.totalCpu / 1000,
      memory: rawDbDetail.totalMemory / 1024,
      storage: rawDbDetail.totalStorage
    },
    totalCpu: rawDbDetail.totalCpu / 1000,
    totalMemory: rawDbDetail.totalMemory / 1024,
    totalStorage: rawDbDetail.totalStorage,

    terminationPolicy: rawDbDetail.terminationPolicy
  };

  return convertedData;
};

export async function updateDatabase(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  {
    params,
    body
  }: {
    params: z.infer<typeof updateDatabaseSchemas.pathParams>;
    body: z.infer<typeof updateDatabaseSchemas.body>;
  }
) {
  const { databaseName } = params;
  const { quota } = body;

  if (!quota) {
    throw new Error('No quota changes provided');
  }

  try {
    const { body: clusterData } = (await k8s.k8sCustomObjects.getNamespacedCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      k8s.namespace,
      'clusters',
      databaseName
    )) as { body: KbPgClusterType };

    if (!clusterData) {
      throw new Error('Database not found');
    }

    const dbDetail = adaptDBDetail(clusterData);

    const currentComponentSpecs = clusterData.spec?.componentSpecs || [];
    const currentSpec = getDatabaseResourceComponentSpec(dbDetail.dbType, currentComponentSpecs);
    const currentCpuNum = dbDetail.cpu / 1000;
    const currentMemoryNum = dbDetail.memory / 1024;
    const currentStorageNum = dbDetail.storage;
    const currentReplicas = currentSpec?.replicas || dbDetail.replicas;

    const currentDataInternal = {
      cpu: dbDetail.cpu,
      memory: dbDetail.memory,
      storage: dbDetail.storage,
      replicas: dbDetail.replicas,
      dbType: dbDetail.dbType,
      dbVersion: dbDetail.dbVersion,
      dbName: databaseName,
      terminationPolicy: 'Delete',
      labels: {}
    };

    const rawDbForm = schema2Raw(currentDataInternal, quota);

    const needsVerticalScaling =
      (quota.cpu !== undefined && quota.cpu !== currentCpuNum) ||
      (quota.memory !== undefined && quota.memory !== currentMemoryNum);

    const needsHorizontalScaling =
      quota.replicas !== undefined && quota.replicas !== currentReplicas;

    const needsVolumeExpansion = quota.storage !== undefined && quota.storage > currentStorageNum;

    const opsRequests: any[] = [];

    if (needsVerticalScaling) {
      const verticalScalingYaml = json2ResourceOps(
        rawDbForm,
        'VerticalScaling',
        currentComponentSpecs
      );
      const opsRequest = yaml.load(verticalScalingYaml) as any;
      opsRequests.push(opsRequest);
    }

    if (needsHorizontalScaling) {
      const horizontalScalingYaml = json2ResourceOps(
        rawDbForm,
        'HorizontalScaling',
        currentComponentSpecs
      );
      const opsRequest = yaml.load(horizontalScalingYaml) as any;
      opsRequests.push(opsRequest);
    }

    if (needsVolumeExpansion) {
      const volumeExpansionYaml = json2ResourceOps(
        rawDbForm,
        'VolumeExpansion',
        currentComponentSpecs
      );
      const opsRequest = yaml.load(volumeExpansionYaml) as any;
      opsRequests.push(opsRequest);
    }

    if (opsRequests.length === 0) {
      const result = raw2Schema(dbDetail);

      return {
        code: 200,
        message: 'No quota changes detected',
        data: result
      };
    }

    const appliedOpsRequests = [];
    for (const opsRequest of opsRequests) {
      const yamlStr = yaml.dump(opsRequest);
      await k8s.applyYamlList([yamlStr], 'create');
      appliedOpsRequests.push(opsRequest);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const { body: updatedClusterData } = (await k8s.k8sCustomObjects.getNamespacedCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      k8s.namespace,
      'clusters',
      databaseName
    )) as { body: KbPgClusterType };

    const adaptedDbDetail = adaptDBDetail(updatedClusterData);

    const result = raw2Schema(adaptedDbDetail);

    return {
      code: 200,
      message: 'Database update initiated successfully',
      data: {
        ...result,
        updatedAt: new Date().toISOString()
      }
    };
  } catch (err: any) {
    if (err?.body?.code === 404 || err?.statusCode === 404) {
      throw new Error('Database not found');
    }

    throw err;
  }
}
