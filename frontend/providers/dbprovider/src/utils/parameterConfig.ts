import { DBReconfigureMap } from '@/constants/db';
import type { DBEditType } from '@/types/db';
import { flattenObject, parseConfig, parseRedisConfig } from '@/utils/tools';
import { CoreV1Api, CustomObjectsApi, PatchUtils } from '@kubernetes/client-node';
import {
  areParameterValuesApplied,
  getParameterDifferences,
  getPostgreSQLConfigSpecPatch
} from './parameterChanges';

export { areParameterValuesApplied, getParameterDifferences } from './parameterChanges';

export async function getCurrentParameterValues({
  dbName,
  dbType,
  namespace,
  k8sCore
}: {
  dbName: string;
  dbType: DBEditType['dbType'];
  namespace: string;
  k8sCore: CoreV1Api;
}) {
  const dbConfig = DBReconfigureMap[dbType];
  if (!dbConfig?.configMapName || !dbConfig.configMapKey) {
    throw new Error(`Parameter configuration is not supported for database type: ${dbType}`);
  }

  const configMapName = dbName + dbConfig.configMapName;
  const { body: configMap } = await k8sCore.readNamespacedConfigMap(configMapName, namespace);
  const configData = configMap.data?.[dbConfig.configMapKey];

  if (!configData) {
    throw new Error(`Parameter configuration is empty for database: ${dbName}`);
  }

  const parsedConfig =
    dbType === 'redis'
      ? parseRedisConfig(configData)
      : parseConfig({ configString: configData, type: dbConfig.type });
  return Object.fromEntries(flattenObject(parsedConfig).map(({ key, value }) => [key, value]));
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
