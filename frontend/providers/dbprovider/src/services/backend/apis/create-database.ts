import { createDatabaseSchemas } from '@/types/apis';
import { getK8s } from '../kubernetes';
import { z } from 'zod';
import { BackupSupportedDBTypeList, DBTypeEnum } from '@/constants/db';
import { updateBackupPolicyApi } from '@/pages/api/backup/updatePolicy';
import { KbPgClusterType } from '@/types/cluster';
import { adaptDBDetail, convertBackupFormToSpec } from '@/utils/adapt';
import { json2Account, json2CreateCluster, json2ParameterConfig } from '@/utils/json2Yaml';
import { DBEditType, EditType } from '@/types/db';
import { getScore } from '@/utils/tools';

const schema2Raw = (dbForm: z.Infer<typeof createDatabaseSchemas.body>): DBEditType => {
  console.log('Original input resources:', dbForm.resource);

  const resources = {
    cpu: dbForm.resource.cpu * 1000,
    memory: dbForm.resource.memory * 1024,
    storage: dbForm.resource.storage,
    replicas: dbForm.resource.replicas
  };

  console.log('Resources for K8s:', resources);

  const formatVersion = (dbType: string, version: string): string => {
    return version;
  };

  const formattedVersion = formatVersion(dbForm.type, dbForm.version);
  console.log('Version formatting:', {
    original: dbForm.version,
    dbType: dbForm.type,
    formatted: formattedVersion
  });

  return {
    dbType: dbForm.type,
    dbVersion: formattedVersion,
    dbName: dbForm.name,
    replicas: resources.replicas,
    cpu: resources.cpu,
    memory: resources.memory,
    storage: resources.storage,
    labels: {},
    terminationPolicy: dbForm.terminationPolicy,
    autoBackup: dbForm.autoBackup,
    parameterConfig: dbForm.parameterConfig || {}
  };
};

const raw2Schema = (
  rawDbDetail: any,
  originalRequest: z.Infer<typeof createDatabaseSchemas.body>
) => {
  console.log('Converting raw DB detail to schema format:', {
    originalCpu: rawDbDetail.cpu,
    originalMemory: rawDbDetail.memory,
    requestCpu: originalRequest.resource.cpu,
    requestMemory: originalRequest.resource.memory
  });

  const convertedData = {
    ...rawDbDetail,
    resource: {
      cpu: originalRequest.resource.cpu,
      memory: originalRequest.resource.memory,
      storage: originalRequest.resource.storage,
      replicas: originalRequest.resource.replicas
    },
    cpu: originalRequest.resource.cpu,
    memory: originalRequest.resource.memory,
    storage: originalRequest.resource.storage,
    totalResource: {
      cpu: originalRequest.resource.cpu * originalRequest.resource.replicas,
      memory: originalRequest.resource.memory * originalRequest.resource.replicas,
      storage: originalRequest.resource.storage * originalRequest.resource.replicas
    },
    totalCpu: originalRequest.resource.cpu * originalRequest.resource.replicas,
    totalMemory: originalRequest.resource.memory * originalRequest.resource.replicas,
    totalStorage: originalRequest.resource.storage * originalRequest.resource.replicas
  };

  console.log('Converted data:', {
    resource: convertedData.resource,
    totalResource: convertedData.totalResource,
    cpu: convertedData.cpu,
    memory: convertedData.memory,
    totalCpu: convertedData.totalCpu,
    totalMemory: convertedData.totalMemory
  });

  return convertedData;
};

export async function createDatabase(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  request: {
    body: z.infer<typeof createDatabaseSchemas.body>;
  }
) {
  console.log('Create database request body:', request.body);

  const rawDbForm = schema2Raw(request.body);

  console.log('Converted rawDbForm for K8s:', {
    name: rawDbForm.dbName,
    type: rawDbForm.dbType,
    version: rawDbForm.dbVersion,
    resources: {
      cpu: rawDbForm.cpu,
      memory: rawDbForm.memory,
      storage: rawDbForm.storage,
      replicas: rawDbForm.replicas
    }
  });

  const account = json2Account(rawDbForm);
  const cluster = json2CreateCluster(rawDbForm, undefined, {
    storageClassName: process.env.STORAGE_CLASSNAME
  });

  console.log('Generated cluster config preview:', {
    name: rawDbForm.dbName,
    cpu: rawDbForm.cpu,
    memory: rawDbForm.memory,
    storage: rawDbForm.storage
  });

  const yamlList = [account, cluster];

  if (['postgresql', 'apecloud-mysql', 'mysql', 'mongodb', 'redis'].includes(rawDbForm.dbType)) {
    if (!(rawDbForm.dbType === 'mysql' && rawDbForm.dbVersion === 'mysql-5.7.42')) {
      let dynamicMaxConnections: number = 0;
      try {
        dynamicMaxConnections = getScore(rawDbForm.dbType, rawDbForm.cpu, rawDbForm.memory);
      } catch (error) {
        console.warn('Failed to calculate dynamic max connections:', error);

        dynamicMaxConnections = 0;
      }

      const config = json2ParameterConfig(
        rawDbForm.dbName,
        rawDbForm.dbType,
        rawDbForm.dbVersion,
        rawDbForm.parameterConfig || {},
        dynamicMaxConnections
      );

      yamlList.push(config);
    }
  }

  console.log('[createDatabase] config', yamlList[2]);
  console.log('Applying YAML resources to K8s...');

  await k8s.applyYamlList(yamlList, 'create');

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const { body } = (await k8s.k8sCustomObjects.getNamespacedCustomObject(
    'apps.kubeblocks.io',
    'v1alpha1',
    k8s.namespace,
    'clusters',
    rawDbForm.dbName
  )) as {
    body: KbPgClusterType;
  };

  const dbUid = body.metadata.uid;
  const dbName = body.metadata.name;
  console.log('Database created with UID:', dbUid, 'Name:', dbName);

  const updateAccountYaml = json2Account(rawDbForm, dbUid);
  await k8s.applyYamlList([updateAccountYaml], 'replace');

  try {
    if (BackupSupportedDBTypeList.includes(rawDbForm.dbType) && rawDbForm?.autoBackup) {
      console.log('Setting up auto backup...');
      const autoBackup = convertBackupFormToSpec({
        autoBackup: rawDbForm?.autoBackup,
        dbType: rawDbForm.dbType
      });

      await updateBackupPolicyApi({
        dbName: rawDbForm.dbName,
        dbType: rawDbForm.dbType,
        autoBackup,
        k8sCustomObjects: k8s.k8sCustomObjects,
        namespace: k8s.namespace
      });
    }

    const adaptedDbDetail = adaptDBDetail(body);
    console.log('Adapted DB detail from K8s:', {
      cpu: adaptedDbDetail.cpu,
      memory: adaptedDbDetail.memory,
      storage: adaptedDbDetail.storage,
      status: adaptedDbDetail.status
    });

    const result = raw2Schema(adaptedDbDetail, request.body);

    console.log('Database created successfully:', {
      name: result.name,
      status: result.status,
      resources: result.resource,
      totalResources: result.totalResource
    });

    return result;
  } catch (err: any) {
    console.error('Error in backup setup or finalizing database:', err);
    if (process.env.NODE_ENV === 'production') {
      throw err;
    } else {
      console.log('Backup setup failed in development, continuing...');
      const adaptedDbDetail = adaptDBDetail(body);
      return raw2Schema(adaptedDbDetail, request.body);
    }
  }
}
