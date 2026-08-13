import { DBReconfigureMap } from '@/constants/db';
import type { DBEditType } from '@/types/db';
import { flattenObject, parseConfig, parseRedisConfig } from '@/utils/tools';
import { CoreV1Api, CustomObjectsApi, PatchUtils } from '@kubernetes/client-node';
import {
  areParameterValuesApplied,
  getParameterDifferences,
  getPostgreSQLConfigSpecPatch,
  mergeRedisParameterValues
} from './parameterChanges';

export {
  areParameterValuesApplied,
  getDefaultMaxConnections,
  getParameterDifferences
} from './parameterChanges';

export async function getCurrentParameterValues({
  dbName,
  dbType,
  namespace,
  k8sCore,
  k8sCustomObjects,
  includeConfigurationOverrides = true
}: {
  dbName: string;
  dbType: DBEditType['dbType'];
  namespace: string;
  k8sCore: CoreV1Api;
  k8sCustomObjects?: CustomObjectsApi;
  includeConfigurationOverrides?: boolean;
}) {
  const dbConfig = DBReconfigureMap[dbType];
  if (!dbConfig?.configMapName || !dbConfig.configMapKey) {
    throw new Error(`Parameter configuration is not supported for database type: ${dbType}`);
  }

  let configMapValues: Record<string, string> = {};
  try {
    const configMapName = dbName + dbConfig.configMapName;
    const { body: configMap } = await k8sCore.readNamespacedConfigMap(configMapName, namespace);
    const configData = configMap.data?.[dbConfig.configMapKey];
    if (configData) {
      const parsedConfig =
        dbType === 'redis'
          ? parseRedisConfig(configData)
          : parseConfig({ configString: configData, type: dbConfig.type });
      configMapValues = Object.fromEntries(
        flattenObject(parsedConfig).map(({ key, value }) => [key, value])
      );
    }
  } catch (error) {
    if (dbType !== 'redis' || !k8sCustomObjects) throw error;
  }

  // Configuration is the fallback source for edit/display reads. History
  // polling explicitly disables this so desired state cannot look applied.
  if (dbType === 'redis' && k8sCustomObjects && includeConfigurationOverrides) {
    try {
      const { body: configuration } = (await k8sCustomObjects.getNamespacedCustomObject(
        'apps.kubeblocks.io',
        'v1alpha1',
        namespace,
        'configurations',
        `${dbName}-redis`
      )) as { body: any };
      const configItem = configuration?.spec?.configItemDetails?.find(
        (item: any) => item.name === dbConfig.reconfigureName
      );
      const configurationValues =
        configItem?.configFileParams?.[dbConfig.configMapKey]?.parameters || {};
      configMapValues = mergeRedisParameterValues(configMapValues, configurationValues);
    } catch (error) {
      if (Object.keys(configMapValues).length === 0) throw error;
    }
  }

  if (Object.keys(configMapValues).length === 0) {
    throw new Error(`Parameter configuration is empty for database: ${dbName}`);
  }
  return configMapValues;
}

export async function ensurePostgreSQLConfigSpec({
  dbName,
  dbVersion,
  namespace,
  k8sCustomObjects
}: {
  dbName: string;
  dbVersion: string;
  namespace: string;
  k8sCustomObjects: CustomObjectsApi;
}) {
  const configurationName = `${dbName}-postgresql`;
  const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
    'apps.kubeblocks.io',
    'v1alpha1',
    namespace,
    'configurations',
    configurationName
  )) as {
    body: {
      spec?: {
        configItemDetails?: Parameters<typeof getPostgreSQLConfigSpecPatch>[0]['configItemDetails'];
      };
    };
  };
  const patch = getPostgreSQLConfigSpecPatch({
    dbVersion,
    configItemDetails: body.spec?.configItemDetails || []
  });
  if (patch.length === 0) return;

  await k8sCustomObjects.patchNamespacedCustomObject(
    'apps.kubeblocks.io',
    'v1alpha1',
    namespace,
    'configurations',
    configurationName,
    patch,
    undefined,
    undefined,
    undefined,
    { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH } }
  );
}
