import { DBReconfigureMap } from '@/constants/db';
import type { DBEditType } from '@/types/db';
import { flattenObject, parseConfig, parseRedisConfig } from '@/utils/tools';
import type { CoreV1Api } from '@kubernetes/client-node';
import { areParameterValuesApplied, getParameterDifferences } from './parameterChanges';

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
