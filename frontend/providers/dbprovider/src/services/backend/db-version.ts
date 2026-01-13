import { DBTypeEnum } from '@/constants/db';
import * as k8s from '@kubernetes/client-node';
import { K8sApiDefault } from './kubernetes';

/**
 * Databases that use ComponentVersion (cmpv) instead of ClusterVersion (cv)
 */
export const COMPONENT_VERSION_DBS = [DBTypeEnum.mongodb, DBTypeEnum.redis, DBTypeEnum.clickhouse];

/**
 * Component name to database type mapping
 */
export interface ComponentMapping {
  dbType: DBTypeEnum | null;
  versionPrefix: string;
  componentNames: string[];
}

/**
 * Get component mapping for a given component name
 */
export function getComponentMapping(componentName: string): ComponentMapping {
  let dbType: DBTypeEnum | null = null;
  let versionPrefix = '';
  let componentNames: string[] = [];

  if (componentName === 'mongodb') {
    dbType = DBTypeEnum.mongodb;
    versionPrefix = 'mongodb-';
    componentNames = ['mongodb'];
  } else if (
    componentName === 'redis' ||
    componentName === 'redis-cluster' ||
    componentName === 'redis-sentinel'
  ) {
    dbType = DBTypeEnum.redis;
    versionPrefix = 'redis-';
    componentNames = ['redis', 'redis-cluster', 'redis-sentinel'];
  } else if (componentName === 'clickhouse') {
    dbType = DBTypeEnum.clickhouse;
    versionPrefix = 'clickhouse-';
    componentNames = ['clickhouse'];
  }

  return { dbType, versionPrefix, componentNames };
}

/**
 * Parse component versions from ComponentVersion CR
 * Returns array of objects with id and label
 */
export function parseComponentVersionsWithLabels(
  cmpvItem: any
): Array<{ id: string; label: string }> {
  const versions =
    cmpvItem?.status?.serviceVersions || cmpvItem?.spec?.compatibilityRules?.[0]?.releases || [];
  if (typeof versions === 'string') {
    return versions.split(',').map((version: string) => ({
      id: version.trim(),
      label: version.trim()
    }));
  }
  if (Array.isArray(versions)) {
    return versions.map((version: any) => ({
      id: typeof version === 'string' ? version : version.name || version.version,
      label: typeof version === 'string' ? version : version.name || version.version
    }));
  }
  return [];
}

/**
 * Sort versions with labels by version number (latest first)
 */
export function sortVersionsWithLabels(
  versions: Array<{ id: string; label: string }>
): Array<{ id: string; label: string }> {
  return versions.sort((a, b) => {
    const aVersion = a.id.match(/[\d.]+/)?.[0];
    const bVersion = b.id.match(/[\d.]+/)?.[0];
    if (aVersion && bVersion) {
      return bVersion.localeCompare(aVersion, undefined, {
        numeric: true,
        sensitivity: 'base'
      });
    }
    return b.id.localeCompare(a.id);
  });
}

/**
 * Core function to fetch all database versions from Kubernetes
 * Returns a map of database type to version objects with id and label
 * This is the base implementation that all other functions should use
 */
export async function fetchAllDatabaseVersionsWithLabels(): Promise<
  Record<string, Array<{ id: string; label: string }>>
> {
  const kc = K8sApiDefault();
  const k8sCustomObjects = kc.makeApiClient(k8s.CustomObjectsApi);

  const DBVersionMap: Record<string, Array<{ id: string; label: string }>> = {
    [DBTypeEnum.postgresql]: [],
    [DBTypeEnum.mongodb]: [],
    [DBTypeEnum.mysql]: [],
    [DBTypeEnum.notapemysql]: [],
    [DBTypeEnum.redis]: [],
    [DBTypeEnum.kafka]: [],
    [DBTypeEnum.qdrant]: [],
    [DBTypeEnum.nebula]: [],
    [DBTypeEnum.weaviate]: [],
    [DBTypeEnum.milvus]: [],
    [DBTypeEnum.pulsar]: [],
    [DBTypeEnum.clickhouse]: []
  };

  // Fetch ClusterVersions (cv) - for most databases
  try {
    const { body: cvBody } = (await k8sCustomObjects.listClusterCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      'clusterversions'
    )) as any;

    cvBody.items.forEach((item: any) => {
      const db = item?.spec?.clusterDefinitionRef as `${DBTypeEnum}`;

      // Only use ClusterVersion for databases not using ComponentVersion
      if (
        DBVersionMap[db] &&
        !COMPONENT_VERSION_DBS.includes(db as DBTypeEnum) &&
        item?.metadata?.name &&
        !DBVersionMap[db].find((existingDb) => existingDb.id === item.metadata.name)
      ) {
        DBVersionMap[db].unshift({
          id: item.metadata.name,
          label: item.metadata.name
        });
      }
    });
  } catch (cvError) {
    console.log('Error fetching ClusterVersions:', cvError);
  }

  // Fetch ComponentVersions (cmpv) - for MongoDB, Redis, and ClickHouse
  try {
    const { body: cmpvBody } = (await k8sCustomObjects.listClusterCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      'componentversions'
    )) as any;

    cmpvBody.items.forEach((item: any) => {
      const componentName = item?.metadata?.name;
      const mapping = getComponentMapping(componentName);

      if (mapping.dbType && DBVersionMap[mapping.dbType]) {
        const versions = parseComponentVersionsWithLabels(item);
        versions.forEach((version) => {
          // Add prefix to match static data format and avoid duplicates
          const prefixedVersion = {
            id: `${mapping.versionPrefix}${version.id}`,
            label: `${mapping.versionPrefix}${version.id}`
          };

          if (
            !DBVersionMap[mapping.dbType!].find((existing) => existing.id === prefixedVersion.id)
          ) {
            DBVersionMap[mapping.dbType!].push(prefixedVersion);
          }
        });
      }
    });
  } catch (cmpvError) {
    console.log('Error fetching ComponentVersions:', cmpvError);
  }

  // Sort versions for better UX (latest first for each database)
  Object.keys(DBVersionMap).forEach((dbType) => {
    DBVersionMap[dbType] = sortVersionsWithLabels(DBVersionMap[dbType]);
  });

  return DBVersionMap;
}

/**
 * Fetch all database versions from Kubernetes
 * Returns a map of database type to version strings
 */
export async function fetchAllDatabaseVersions(): Promise<Record<string, string[]>> {
  const versionsWithLabels = await fetchAllDatabaseVersionsWithLabels();
  const result: Record<string, string[]> = {};

  Object.keys(versionsWithLabels).forEach((dbType) => {
    result[dbType] = versionsWithLabels[dbType].map((v) => v.id);
  });

  return result;
}

/**
 * Fetch versions for a specific database type
 * Returns array of version strings
 */
export async function fetchDatabaseVersions(dbType: string): Promise<string[]> {
  const allVersions = await fetchAllDatabaseVersions();
  return allVersions[dbType] || [];
}
