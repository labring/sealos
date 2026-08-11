import { DBReconfigureMap } from '@/constants/db';
import type { DBEditType } from '@/types/db';
import { flattenObject, parseConfig, parseRedisConfig } from '@/utils/tools';
import type { CoreV1Api, CustomObjectsApi } from '@kubernetes/client-node';

type ParameterConfig = NonNullable<DBEditType['parameterConfig']>;
type ParameterPath = {
  current: string;
  requested: string;
};

const parameterPathsByDbType: Record<
  string,
  Partial<Record<keyof ParameterConfig, ParameterPath>>
> = {
  postgresql: {
    maxConnections: { current: 'max_connections', requested: 'max_connections' },
    timeZone: { current: 'timezone', requested: 'timezone' }
  },
  'apecloud-mysql': {
    maxConnections: { current: 'mysqld.max_connections', requested: 'max_connections' },
    timeZone: { current: 'mysqld.default-time-zone', requested: 'default-time-zone' },
    lowerCaseTableNames: {
      current: 'mysqld.lower_case_table_names',
      requested: 'lower_case_table_names'
    }
  },
  mongodb: {
    maxConnections: {
      current: 'net.maxIncomingConnections',
      requested: 'net.maxIncomingConnections'
    }
  },
  redis: {
    maxConnections: { current: 'maxclients', requested: 'maxclients' },
    maxmemory: { current: 'maxmemory', requested: 'maxmemory' }
  }
};

export const getDBConfigurationName = (dbName: string, dbType: string) => {
  const suffixByDbType: Record<string, string> = {
    postgresql: 'postgresql',
    'apecloud-mysql': 'mysql',
    mongodb: 'mongodb',
    redis: 'redis'
  };
  const suffix = suffixByDbType[dbType];

  if (!suffix) {
    throw new Error(`Unsupported database type: ${dbType}`);
  }

  return `${dbName}-${suffix}`;
};

export function extractParameterConfigFromConfiguration(
  configuration: any,
  dbType: string
): DBEditType['parameterConfig'] {
  if (!configuration?.spec?.configItemDetails) {
    return undefined;
  }

  const parameterConfig: ParameterConfig = {};
  let hasParams = false;

  for (const configItem of configuration.spec.configItemDetails) {
    if (!configItem.configFileParams) continue;

    switch (dbType) {
      case 'postgresql': {
        const params = configItem.configFileParams['postgresql.conf']?.parameters || {};
        if (params.max_connections !== undefined) {
          parameterConfig.maxConnections = String(params.max_connections);
          parameterConfig.isMaxConnectionsCustomized = true;
          hasParams = true;
        }
        if (params.timezone !== undefined) {
          parameterConfig.timeZone = String(params.timezone);
          hasParams = true;
        }
        break;
      }
      case 'apecloud-mysql': {
        const params = configItem.configFileParams['my.cnf']?.parameters || {};
        if (params.max_connections !== undefined) {
          parameterConfig.maxConnections = String(params.max_connections);
          parameterConfig.isMaxConnectionsCustomized = true;
          hasParams = true;
        }
        if (params['default-time-zone'] !== undefined) {
          const timezone = String(params['default-time-zone']);
          parameterConfig.timeZone =
            timezone === '+00:00' ? 'UTC' : timezone === '+08:00' ? 'Asia/Shanghai' : timezone;
          hasParams = true;
        }
        if (params.lower_case_table_names !== undefined) {
          parameterConfig.lowerCaseTableNames = String(params.lower_case_table_names);
          hasParams = true;
        }
        break;
      }
      case 'mongodb': {
        const params = configItem.configFileParams['mongodb.conf']?.parameters || {};
        if (params['net.maxIncomingConnections'] !== undefined) {
          parameterConfig.maxConnections = String(params['net.maxIncomingConnections']);
          parameterConfig.isMaxConnectionsCustomized = true;
          hasParams = true;
        }
        break;
      }
      case 'redis': {
        const params = configItem.configFileParams['redis.conf']?.parameters || {};
        if (params.maxclients !== undefined) {
          parameterConfig.maxConnections = String(params.maxclients);
          parameterConfig.isMaxConnectionsCustomized = true;
          hasParams = true;
        }
        if (params.maxmemory !== undefined) {
          parameterConfig.maxmemory = String(params.maxmemory);
          hasParams = true;
        }
        break;
      }
    }
  }

  return hasParams ? parameterConfig : undefined;
}

export function getParameterDifferences({
  dbType,
  current,
  requested,
  dynamicMaxConnections
}: {
  dbType: string;
  current: Record<string, string>;
  requested: DBEditType['parameterConfig'];
  dynamicMaxConnections: number;
}) {
  const paths = parameterPathsByDbType[dbType];
  if (!paths) return [];

  const desired: ParameterConfig = {
    ...requested,
    maxConnections: requested?.isMaxConnectionsCustomized
      ? requested.maxConnections
      : dynamicMaxConnections.toString(),
    ...(dbType === 'apecloud-mysql' && {
      lowerCaseTableNames: requested?.lowerCaseTableNames || '0'
    })
  };

  return Object.entries(paths).flatMap(([field, paths]) => {
    const key = field as keyof ParameterConfig;
    const newValue = desired[key];
    if (newValue === undefined) return [];

    const oldValue = current[paths.current];
    if (String(oldValue ?? '') === String(newValue)) return [];

    return [
      {
        path: paths.requested,
        oldValue: String(oldValue ?? ''),
        newValue: String(newValue)
      }
    ];
  });
}

export async function getCurrentParameterValues({
  dbName,
  dbType,
  namespace,
  k8sCore,
  k8sCustomObjects
}: {
  dbName: string;
  dbType: DBEditType['dbType'];
  namespace: string;
  k8sCore: CoreV1Api;
  k8sCustomObjects: CustomObjectsApi;
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
  const currentValues = Object.fromEntries(
    flattenObject(parsedConfig).map(({ key, value }) => [key, value])
  );

  if (dbType === 'redis') {
    try {
      const { body: configuration } = (await k8sCustomObjects.getNamespacedCustomObject(
        'apps.kubeblocks.io',
        'v1alpha1',
        namespace,
        'configurations',
        getDBConfigurationName(dbName, dbType)
      )) as { body: any };
      const redisConfig = configuration?.spec?.configItemDetails?.find(
        (item: any) => item.name === dbConfig.reconfigureName
      );
      Object.assign(currentValues, redisConfig?.configFileParams?.['redis.conf']?.parameters || {});
    } catch (error) {
      console.warn('Failed to read Redis configuration overrides:', error);
    }
  }

  return currentValues;
}
