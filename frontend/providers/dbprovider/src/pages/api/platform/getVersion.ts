import type { NextApiRequest, NextApiResponse } from 'next';
import { K8sApi } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { DBTypeEnum } from '@/constants/db';
import * as k8s from '@kubernetes/client-node';
import { DBVersionMap } from '@/store/static';

export type Response = Record<
  `${DBTypeEnum}`,
  {
    id: string;
    label: string;
  }[]
>;

const MOCK: Response = DBVersionMap;

// Databases that use ComponentVersion (cmpv) instead of ClusterVersion (cv)
const COMPONENT_VERSION_DBS = [DBTypeEnum.mongodb, DBTypeEnum.redis, DBTypeEnum.clickhouse];

// Helper function to parse component versions
const parseComponentVersions = (cmpvItem: any): Array<{ id: string; label: string }> => {
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
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const DBVersionMap: Response = {
      [DBTypeEnum.postgresql]: [],
      [DBTypeEnum.mongodb]: [],
      [DBTypeEnum.mysql]: [],
      [DBTypeEnum.redis]: [],
      [DBTypeEnum.kafka]: [],
      [DBTypeEnum.qdrant]: [],
      [DBTypeEnum.nebula]: [],
      [DBTypeEnum.weaviate]: [],
      [DBTypeEnum.milvus]: [],
      [DBTypeEnum.pulsar]: [],
      [DBTypeEnum.clickhouse]: []
    };

    const kc = K8sApi();
    const k8sCustomObjects = kc.makeApiClient(k8s.CustomObjectsApi);

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

    // Fetch ComponentVersions (cmpv) - for MongoDB and Redis
    try {
      const { body: cmpvBody } = (await k8sCustomObjects.listClusterCustomObject(
        'apps.kubeblocks.io',
        'v1alpha1',
        'componentversions'
      )) as any;

      cmpvBody.items.forEach((item: any) => {
        const componentName = item?.metadata?.name;
        let dbType: DBTypeEnum | null = null;
        let versionPrefix = '';

        // Map component names to database types and set version prefix
        if (componentName === 'mongodb') {
          dbType = DBTypeEnum.mongodb;
          versionPrefix = 'mongodb-';
        } else if (
          componentName === 'redis' ||
          componentName === 'redis-cluster' ||
          componentName === 'redis-sentinel'
        ) {
          dbType = DBTypeEnum.redis;
          versionPrefix = 'redis-';
        }

        if (dbType && DBVersionMap[dbType]) {
          const versions = parseComponentVersions(item);
          versions.forEach((version) => {
            // Add prefix to match static data format and avoid duplicates
            const prefixedVersion = {
              id: `${versionPrefix}${version.id}`,
              label: `${versionPrefix}${version.id}`
            };

            if (!DBVersionMap[dbType!].find((existing) => existing.id === prefixedVersion.id)) {
              DBVersionMap[dbType!].push(prefixedVersion);
            }
          });
        }
      });
    } catch (cmpvError) {
      console.log('Error fetching ComponentVersions:', cmpvError);
    }

    // Sort versions for better UX (latest first for each database)
    Object.keys(DBVersionMap).forEach((dbType) => {
      DBVersionMap[dbType as keyof typeof DBVersionMap].sort((a, b) => {
        // Try to sort by version number if possible
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
    });

    // Sort MySQL versions to ensure mysql-5.7.42 appears last
    if (DBVersionMap[DBTypeEnum.mysql].length > 0) {
      DBVersionMap[DBTypeEnum.mysql].sort((a, b) => {
        // Move mysql-5.7.42 to the end
        if (a.id === 'mysql-5.7.42') return 1;
        if (b.id === 'mysql-5.7.42') return -1;
        // Keep other versions in their original order
        return 0;
      });
    }

    jsonRes(res, {
      data: DBVersionMap
    });
  } catch (error) {
    console.log('Error in getVersion API:', error);
    jsonRes(res, {
      data: MOCK
    });
  }
}
