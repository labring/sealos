import { createDatabaseSchemas } from '@/types/apis/v2alpha';
import { getK8s } from '../kubernetes';
import { z } from 'zod';
import { BackupSupportedDBTypeList, DBTypeEnum } from '@/constants/db';
import { updateBackupPolicyApi } from '@/pages/api/backup/updatePolicy';
import { KbPgClusterType } from '@/types/cluster';
import { adaptDBDetail, convertBackupFormToSpec } from '@/utils/adapt';
import { json2Account, json2CreateCluster, json2ParameterConfig } from '@/utils/json2Yaml';
import { DBEditType, EditType } from '@/types/db';
import { getScore } from '@/utils/tools';
import { fetchDatabaseVersions } from '../db-version';

// Cache for version information to avoid repeated API calls
const versionCache = new Map<string, { version: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

/**
 * Get latest version of database
 */
async function getLatestVersion(
  k8sClient: Awaited<ReturnType<typeof getK8s>>,
  dbType: string
): Promise<string> {
  const cacheKey = `${k8sClient.namespace}-${dbType}`;
  const cached = versionCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.version;
  }

  try {
    let versions = await fetchDatabaseVersions(dbType);

    // Filter out mysql-8.0.33 if it exists
    if (dbType === 'mysql') {
      versions = versions.filter((v) => v !== 'mysql-8.0.33');
    }

    if (versions.length === 0) {
      throw new Error(`No version found for database type: ${dbType}`);
    }

    const latestVersion = versions[0];

    versionCache.set(cacheKey, { version: latestVersion, timestamp: now });

    return latestVersion;
  } catch (error) {
    throw new Error(`Failed to get latest version for ${dbType}: ${error}`);
  }
}

const schema2Raw = (dbForm: z.infer<typeof createDatabaseSchemas.body>): DBEditType => {
  const resources = {
    cpu: dbForm.quota.cpu * 1000,
    memory: dbForm.quota.memory * 1024,
    storage: dbForm.quota.storage,
    replicas: dbForm.quota.replicas
  };
  const version = dbForm.version!;
  const terminationPolicy = dbForm.terminationPolicy!;

  return {
    dbType: dbForm.type,
    dbVersion: version,
    dbName: dbForm.name,
    replicas: resources.replicas,
    cpu: resources.cpu,
    memory: resources.memory,
    storage: resources.storage,
    labels: {},
    terminationPolicy: (terminationPolicy.charAt(0).toUpperCase() + terminationPolicy.slice(1)) as
      | 'Delete'
      | 'WipeOut',
    autoBackup: dbForm.autoBackup,
    parameterConfig: dbForm.parameterConfig || {}
  };
};

const raw2Schema = (
  rawDbDetail: any,
  originalRequest: z.infer<typeof createDatabaseSchemas.body>
) => {
  const convertedData = {
    ...rawDbDetail,
    quota: {
      cpu: originalRequest.quota.cpu,
      memory: originalRequest.quota.memory,
      storage: originalRequest.quota.storage,
      replicas: originalRequest.quota.replicas
    },
    cpu: originalRequest.quota.cpu,
    memory: originalRequest.quota.memory,
    storage: originalRequest.quota.storage,
    totalResource: {
      cpu: originalRequest.quota.cpu * originalRequest.quota.replicas,
      memory: originalRequest.quota.memory * originalRequest.quota.replicas,
      storage: originalRequest.quota.storage * originalRequest.quota.replicas
    },
    totalCpu: originalRequest.quota.cpu * originalRequest.quota.replicas,
    totalMemory: originalRequest.quota.memory * originalRequest.quota.replicas,
    totalStorage: originalRequest.quota.storage * originalRequest.quota.replicas
  };

  return convertedData;
};

export async function createDatabase(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  request: {
    body: z.infer<typeof createDatabaseSchemas.body>;
  }
) {
  const requestBody = { ...request.body };

  if (!requestBody.terminationPolicy) {
    requestBody.terminationPolicy = 'delete';
  }
  //default get latest version of database
  if (!requestBody.version) {
    try {
      requestBody.version = await getLatestVersion(k8s, requestBody.type);
    } catch (error) {
      throw new Error(
        `Failed to determine database version for type ${requestBody.type}. Please specify version explicitly.`
      );
    }
  }

  const rawDbForm = schema2Raw(requestBody);

  const account = json2Account(rawDbForm);
  const cluster = json2CreateCluster(rawDbForm, undefined, {
    storageClassName: process.env.STORAGE_CLASSNAME
  });

  const yamlList = [account, cluster];

  if (['postgresql', 'apecloud-mysql', 'mysql', 'mongodb', 'redis'].includes(rawDbForm.dbType)) {
    if (!(rawDbForm.dbType === 'mysql' && rawDbForm.dbVersion === 'mysql-5.7.42')) {
      let dynamicMaxConnections: number = 0;
      try {
        dynamicMaxConnections = getScore(rawDbForm.dbType, rawDbForm.cpu, rawDbForm.memory);
      } catch (error) {
        dynamicMaxConnections = 0;
      }

      const config = json2ParameterConfig(
        rawDbForm.dbName,
        rawDbForm.dbType,
        rawDbForm.dbVersion,
        rawDbForm.parameterConfig || {},
        dynamicMaxConnections
      );

      yamlList.unshift(config);
    }
  }

  await k8s.applyYamlList(yamlList, 'create');

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

  const updateAccountYaml = json2Account(rawDbForm, dbUid);

  const needsBackup = BackupSupportedDBTypeList.includes(rawDbForm.dbType) && rawDbForm?.autoBackup;
  const autoBackupConfig = needsBackup
    ? convertBackupFormToSpec({
        autoBackup: rawDbForm?.autoBackup,
        dbType: rawDbForm.dbType
      })
    : null;

  try {
    const tasks: Promise<any>[] = [k8s.applyYamlList([updateAccountYaml], 'replace')];

    if (needsBackup && autoBackupConfig) {
      tasks.push(
        updateBackupPolicyApi({
          dbName: rawDbForm.dbName,
          dbType: rawDbForm.dbType,
          autoBackup: autoBackupConfig,
          k8sCustomObjects: k8s.k8sCustomObjects,
          namespace: k8s.namespace
        })
      );
    }

    await Promise.all(tasks);

    const adaptedDbDetail = adaptDBDetail(body);
    return raw2Schema(adaptedDbDetail, request.body);
  } catch (err: any) {
    if (process.env.NODE_ENV === 'production') {
      throw err;
    } else {
      const adaptedDbDetail = adaptDBDetail(body);
      return raw2Schema(adaptedDbDetail, request.body);
    }
  }
}
