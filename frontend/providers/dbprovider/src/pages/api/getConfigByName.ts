import {
  DBReconfigureMap,
  ParameterFieldOverrides,
  ParameterFieldMetadataMap
} from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { KbPgClusterType } from '@/types/cluster';
import {
  ConfigParameterItem,
  DBType,
  ParameterConfigField,
  ParameterFieldMetadata
} from '@/types/db';
import { parseConfig, flattenObject } from '@/utils/tools';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Merges default and version-specific field overrides.
 * Version-specific overrides take precedence over default ones.
 * @param defaultOverrides - Default field overrides
 * @param versionOverrides - Version-specific field overrides
 * @returns Merged field overrides array
 */
function mergeFieldOverrides(
  defaultOverrides: ParameterConfigField[] = [],
  versionOverrides: ParameterConfigField[] = []
): ParameterConfigField[] {
  const mergedMap = new Map<string, ParameterConfigField>();

  defaultOverrides.forEach((field) => {
    mergedMap.set(field.name, field);
  });

  versionOverrides.forEach((field) => {
    mergedMap.set(field.name, field);
  });

  return Array.from(mergedMap.values());
}

/**
 * Merges default and version-specific field metadata.
 * Version-specific metadata overrides default metadata.
 * @param defaultMetadata - Default field metadata
 * @param versionMetadata - Version-specific field metadata
 * @returns Merged field metadata object
 */
function mergeFieldMetadata(
  defaultMetadata: Record<string, ParameterFieldMetadata> = {},
  versionMetadata: Record<string, ParameterFieldMetadata> = {}
): Record<string, ParameterFieldMetadata> {
  const merged: Record<string, ParameterFieldMetadata> = { ...defaultMetadata };

  Object.keys(versionMetadata).forEach((key) => {
    merged[key] = { ...merged[key], ...versionMetadata[key] };
  });

  return merged;
}

/**
 * Extracts version key from full version string.
 * @param dbVersion - Full version string (e.g., "8.0.35")
 * @returns Version key (e.g., "8.0") or "default" if not found
 */
function getVersionKey(dbVersion: string | undefined): string {
  if (!dbVersion) return 'default';

  const match = dbVersion.match(/^(\d+\.\d+)/);
  return match ? match[1] : 'default';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name, dbType } = req.query as { name: string; dbType: DBType };
    if (!name) {
      throw new Error('name is empty');
    }

    const { namespace, k8sCore, k8sCustomObjects } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const dbConfig = DBReconfigureMap[dbType];
    const key = name + dbConfig.configMapName;
    if (!key || !dbConfig.configMapName) {
      return jsonRes(res, {
        data: null
      });
    }

    let dbVersion: string | undefined;
    try {
      const { body: clusterData } = (await k8sCustomObjects.getNamespacedCustomObject(
        'apps.kubeblocks.io',
        'v1alpha1',
        namespace,
        'clusters',
        name
      )) as { body: KbPgClusterType };
      dbVersion = clusterData?.metadata?.labels?.['clusterversion.kubeblocks.io/name'];
    } catch (error) {
      console.warn('Failed to get cluster version, using default config:', error);
    }

    const { body } = await k8sCore.readNamespacedConfigMap(key, namespace);

    const configData = body?.data && body?.data[dbConfig.configMapKey];
    if (!configData) {
      return jsonRes(res, {
        data: null
      });
    }

    const parsedConfig = parseConfig({
      configString: configData,
      type: dbConfig.type
    });
    const flattenedConfig = flattenObject(parsedConfig);

    const versionedOverrides = ParameterFieldOverrides[dbType] || {};
    const versionedMetadata = ParameterFieldMetadataMap[dbType] || {};

    const versionKey = getVersionKey(dbVersion);

    const defaultOverrides = versionedOverrides['default'] || [];
    const versionOverrides = versionedOverrides[versionKey] || [];
    const fieldOverrides = mergeFieldOverrides(defaultOverrides, versionOverrides);

    const defaultMetadata = versionedMetadata['default'] || {};
    const versionMetadata = versionedMetadata[versionKey] || {};
    const fieldMetadataMap = mergeFieldMetadata(defaultMetadata, versionMetadata);

    const overrideMap = new Map<string, ParameterConfigField>();
    fieldOverrides.forEach((field) => {
      overrideMap.set(field.name, field);
    });

    const result: ConfigParameterItem[] = flattenedConfig
      .map((item): ConfigParameterItem | null => {
        const override = overrideMap.get(item.key);
        const metadata = fieldMetadataMap[item.key];

        const editable = metadata?.editable !== undefined ? metadata.editable : false;
        const hidden = metadata?.hidden !== undefined ? metadata.hidden : false;

        const baseItem = {
          key: item.key,
          value: item.value,
          description: override?.description,
          editable,
          hidden
        };

        if (override?.type === 'enum') {
          return {
            ...baseItem,
            type: 'enum' as const,
            enumValues: override.values
          };
        }

        return {
          ...baseItem,
          type: 'string' as const
        };
      })
      .filter((item): item is ConfigParameterItem => item !== null && !item.hidden);

    jsonRes(res, {
      data: result
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
