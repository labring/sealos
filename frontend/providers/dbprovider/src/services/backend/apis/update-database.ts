import { json2ResourceOps } from '@/utils/json2Yaml';
import { adaptDBDetail, getDatabaseResourceComponentSpec } from '@/utils/adapt';
import { KbPgClusterType } from '@/types/cluster';
import { updateDatabaseSchemas } from '@/types/apis';
import z from 'zod';
import { getK8s } from '../kubernetes';
import * as yaml from 'js-yaml';

const schema2Raw = (currentData: any, updateResource: any) => {
  console.log('Update - Original input resources:', updateResource);

  const resources = {
    cpu: updateResource.cpu !== undefined ? updateResource.cpu * 1000 : currentData.cpu,
    memory: updateResource.memory !== undefined ? updateResource.memory * 1024 : currentData.memory,
    storage: updateResource.storage !== undefined ? updateResource.storage : currentData.storage,
    replicas: updateResource.replicas !== undefined ? updateResource.replicas : currentData.replicas
  };

  console.log('Update - Converted resources for K8s:', resources);

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
  const totalStorage =
    rawDbDetail.dbType === 'polardbx' ? rawDbDetail.storage : rawDbDetail.totalStorage;

  const convertedData = {
    id: rawDbDetail.id,
    name: rawDbDetail.dbName || rawDbDetail.name,
    dbType: rawDbDetail.dbType,
    dbVersion: rawDbDetail.dbVersion,
    status: rawDbDetail.status,
    createTime: rawDbDetail.createTime,

    resource: {
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
      storage: totalStorage
    },
    totalCpu: rawDbDetail.totalCpu / 1000,
    totalMemory: rawDbDetail.totalMemory / 1024,
    totalStorage,

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
  const { resource } = body;

  if (!resource) {
    throw new Error('No resource changes provided');
  }

  try {
    console.log('Update database request:', { databaseName, resource });

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
    console.log('Current DB detail:', dbDetail);

    const currentComponentSpecs = clusterData.spec?.componentSpecs || [];
    const currentSpec = getDatabaseResourceComponentSpec(dbDetail.dbType, currentComponentSpecs);
    const currentCpuNum = dbDetail.cpu / 1000;
    const currentMemoryNum = dbDetail.memory / 1024;
    const currentStorageNum = dbDetail.storage;
    const currentReplicas = currentSpec?.replicas || dbDetail.replicas;

    console.log('Current resources in user format:', {
      currentCpu: currentCpuNum,
      currentMemory: currentMemoryNum,
      currentStorage: currentStorageNum,
      currentReplicas
    });

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

    const rawDbForm = schema2Raw(currentDataInternal, resource);

    console.log('Converted rawDbForm for K8s ops:', {
      name: rawDbForm.dbName,
      resources: {
        cpu: rawDbForm.cpu,
        memory: rawDbForm.memory,
        storage: rawDbForm.storage,
        replicas: rawDbForm.replicas
      }
    });

    const needsVerticalScaling =
      (resource.cpu !== undefined && resource.cpu !== currentCpuNum) ||
      (resource.memory !== undefined && resource.memory !== currentMemoryNum);

    const needsHorizontalScaling =
      resource.replicas !== undefined && resource.replicas !== currentReplicas;

    const needsVolumeExpansion =
      resource.storage !== undefined && resource.storage > currentStorageNum;

    console.log('Operations needed:', {
      needsVerticalScaling,
      needsHorizontalScaling,
      needsVolumeExpansion
    });

    const opsRequests: any[] = [];

    if (needsVerticalScaling) {
      console.log('Creating VerticalScaling ops with data:', {
        cpu: rawDbForm.cpu,
        memory: rawDbForm.memory
      });

      const verticalScalingYaml = json2ResourceOps(
        rawDbForm,
        'VerticalScaling',
        currentComponentSpecs
      );
      const opsRequest = yaml.load(verticalScalingYaml) as any;
      opsRequests.push(opsRequest);
    }

    if (needsHorizontalScaling) {
      console.log('Creating HorizontalScaling ops with data:', {
        replicas: rawDbForm.replicas
      });

      const horizontalScalingYaml = json2ResourceOps(
        rawDbForm,
        'HorizontalScaling',
        currentComponentSpecs
      );
      const opsRequest = yaml.load(horizontalScalingYaml) as any;
      opsRequests.push(opsRequest);
    }

    if (needsVolumeExpansion) {
      console.log('Creating VolumeExpansion ops with data:', {
        storage: rawDbForm.storage
      });

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
        message: 'No resource changes detected',
        data: result
      };
    }

    const appliedOpsRequests = [];
    for (const opsRequest of opsRequests) {
      const yamlStr = yaml.dump(opsRequest);
      console.log('Applying ops request YAML:', yamlStr);

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
    console.log('Updated DB detail from K8s:', {
      cpu: adaptedDbDetail.cpu,
      memory: adaptedDbDetail.memory,
      storage: adaptedDbDetail.storage,
      status: adaptedDbDetail.status
    });

    const result = raw2Schema(adaptedDbDetail);

    console.log('Database updated successfully:', {
      name: result.name,
      status: result.status,
      resources: result.resource,
      totalResources: result.totalResource
    });

    return {
      code: 200,
      message: 'Database update initiated successfully',
      data: {
        ...result,
        updatedAt: new Date().toISOString()
      }
    };
  } catch (err: any) {
    console.error('Error updating database:', {
      message: err.message,
      stack: err.stack,
      databaseName,
      resource
    });

    if (err?.body?.code === 404 || err?.statusCode === 404) {
      throw new Error('Database not found');
    }

    throw err;
  }
}
