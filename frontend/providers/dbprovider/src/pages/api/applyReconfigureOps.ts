import { DBReconfigureMap, ParameterFieldMetadataMap } from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { KbPgClusterType } from '@/types/cluster';
import { DBType, ParameterFieldMetadata } from '@/types/db';
import { adjustDifferencesForIni } from '@/utils/tools';
import { json2Reconfigure } from '@/utils/json2Yaml';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Merges default and version-specific field metadata.
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
    const { dbName, dbType, differences } = req.body as {
      dbName: string;
      dbType: DBType;
      // oldValue is for displaying previous value. accepting frontend value is ok.
      differences: { path: string; oldValue: string; newValue: string }[];
    };

    if (!dbName || !dbType || !differences || differences.length === 0) {
      return jsonRes(res, {
        code: 500,
        error: 'Invalid parameters: dbName, dbType, and differences are required'
      });
    }

    const { k8sCustomObjects, applyYamlList, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const { body: clusterData } = (await k8sCustomObjects.getNamespacedCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      namespace,
      'clusters',
      dbName
    )) as { body: KbPgClusterType };

    if (!clusterData || !clusterData.metadata?.uid) {
      return jsonRes(res, {
        code: 500,
        error: 'Database cluster not found'
      });
    }

    const dbUid = clusterData.metadata.uid;
    const reconfigureType = DBReconfigureMap[dbType].type;

    // Get field metadata to filter non-editable fields
    const dbVersion = clusterData?.metadata?.labels?.['clusterversion.kubeblocks.io/name'];
    const versionedMetadata = ParameterFieldMetadataMap[dbType] || {};
    const versionKey = getVersionKey(dbVersion);
    const defaultMetadata = versionedMetadata['default'] || {};
    const versionMetadata = versionedMetadata[versionKey] || {};
    const fieldMetadataMap = mergeFieldMetadata(defaultMetadata, versionMetadata);

    // Filter out non-editable fields (editable defaults to false, whitelist mode)
    const editableDifferences = differences.filter((diff) => {
      const metadata = fieldMetadataMap[diff.path];
      const editable = metadata?.editable !== undefined ? metadata.editable : false;
      return editable;
    });

    if (editableDifferences.length === 0) {
      return jsonRes(res, {
        code: 500,
        error: 'No editable fields to update'
      });
    }

    const adjustedDifferences = adjustDifferencesForIni(
      editableDifferences,
      reconfigureType,
      dbType
    );
    const reconfigureYaml = json2Reconfigure(dbName, dbType, dbUid, adjustedDifferences);

    await applyYamlList([reconfigureYaml], 'create');

    jsonRes(res, {
      data: { success: true }
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
