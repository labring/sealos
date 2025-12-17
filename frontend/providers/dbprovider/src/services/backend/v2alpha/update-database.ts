import { json2ResourceOps } from '@/utils/json2Yaml';
import { adaptDBDetail } from '@/utils/adapt';
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

const raw2Schema = (rawDbDetail: any, originalRequest: any, updateQuota: any) => {
  const finalCpu = updateQuota.cpu !== undefined ? updateQuota.cpu : rawDbDetail.cpu;
  const finalMemory = updateQuota.memory !== undefined ? updateQuota.memory : rawDbDetail.memory;
  const finalStorage =
    updateQuota.storage !== undefined ? updateQuota.storage : rawDbDetail.storage;
  const finalReplicas =
    updateQuota.replicas !== undefined ? updateQuota.replicas : rawDbDetail.replicas;

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
      cpu: finalCpu * finalReplicas,
      memory: finalMemory * finalReplicas,
      storage: finalStorage * finalReplicas
    },
    totalCpu: finalCpu * finalReplicas,
    totalMemory: finalMemory * finalReplicas,
    totalStorage: finalStorage * finalReplicas,

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

    const currentSpec = clusterData.spec?.componentSpecs?.[0];
    const currentCpu = currentSpec?.resources?.limits?.cpu || '1000m';
    const currentMemory = currentSpec?.resources?.limits?.memory || '1Gi';
    const currentStorage =
      currentSpec?.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage || '3Gi';
    const currentReplicas = currentSpec?.replicas || 3;

    const currentCpuNum = parseCpuToUserFormat(currentCpu);
    const currentMemoryNum = parseMemoryToUserFormat(currentMemory);
    const currentStorageNum = parseStorageToUserFormat(currentStorage);

    const currentDataInternal = {
      cpu: dbDetail.cpu * 1000,
      memory: dbDetail.memory * 1024,
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
      const verticalScalingYaml = json2ResourceOps(rawDbForm, 'VerticalScaling');
      const opsRequest = yaml.load(verticalScalingYaml) as any;
      opsRequests.push(opsRequest);
    }

    if (needsHorizontalScaling) {
      const horizontalScalingYaml = json2ResourceOps(rawDbForm, 'HorizontalScaling');
      const opsRequest = yaml.load(horizontalScalingYaml) as any;
      opsRequests.push(opsRequest);
    }

    if (needsVolumeExpansion) {
      const volumeExpansionYaml = json2ResourceOps(rawDbForm, 'VolumeExpansion');
      const opsRequest = yaml.load(volumeExpansionYaml) as any;
      opsRequests.push(opsRequest);
    }

    if (opsRequests.length === 0) {
      const result = raw2Schema(dbDetail, null, {});

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

    const result = raw2Schema(adaptedDbDetail, null, quota);

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

function parseCpuToUserFormat(cpu: string): number {
  if (cpu.endsWith('m')) {
    return parseInt(cpu.slice(0, -1)) / 1000;
  }
  return parseFloat(cpu);
}

function parseMemoryToUserFormat(memory: string): number {
  if (memory.endsWith('Gi')) {
    return parseInt(memory.slice(0, -2));
  }
  if (memory.endsWith('Mi')) {
    const miValue = parseInt(memory.slice(0, -2));
    return miValue / 1024;
  }
  if (memory.endsWith('Ki')) {
    return parseInt(memory.slice(0, -2)) / 1048576;
  }
  return parseFloat(memory);
}

function parseStorageToUserFormat(storage: string): number {
  if (storage.endsWith('Gi')) {
    return parseInt(storage.slice(0, -2));
  }
  if (storage.endsWith('Mi')) {
    return parseInt(storage.slice(0, -2)) / 1024;
  }
  if (storage.endsWith('Ti')) {
    return parseInt(storage.slice(0, -2)) * 1024;
  }
  return parseFloat(storage);
}
