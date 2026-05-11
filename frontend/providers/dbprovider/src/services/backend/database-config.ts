import type { CustomObjectsApi } from '@kubernetes/client-node';
import type { DBEditType } from '@/types/db';

export type ParameterConfig = NonNullable<DBEditType['parameterConfig']>;
export type ConfigurableDbType = 'postgresql' | 'apecloud-mysql' | 'mysql' | 'mongodb' | 'redis';
export type ConfigOperation = 'create' | 'edit';

const CONFIGURABLE_DB_TYPES: ConfigurableDbType[] = [
  'postgresql',
  'apecloud-mysql',
  'mysql',
  'mongodb',
  'redis'
];
const MYSQL_DB_TYPES = ['apecloud-mysql', 'mysql'] as const;

export const supportsParameterConfigDbType = (dbType?: string): dbType is ConfigurableDbType =>
  CONFIGURABLE_DB_TYPES.includes(dbType as ConfigurableDbType);

export const isMySqlDbType = (dbType?: string): dbType is (typeof MYSQL_DB_TYPES)[number] =>
  MYSQL_DB_TYPES.includes(dbType as (typeof MYSQL_DB_TYPES)[number]);

export const isMysql5742 = (dbType?: string, dbVersion?: string) =>
  isMySqlDbType(dbType) && dbVersion === 'mysql-5.7.42';

export function getConfigurationName(dbName: string, dbType: string) {
  switch (dbType) {
    case 'postgresql':
      return `${dbName}-postgresql`;
    case 'apecloud-mysql':
    case 'mysql':
      return `${dbName}-mysql`;
    case 'mongodb':
      return `${dbName}-mongodb`;
    case 'redis':
      return `${dbName}-redis`;
    default:
      throw new Error(`Unsupported database type: ${dbType}`);
  }
}

export async function getDBConfigurationByName({
  k8sCustomObjects,
  namespace,
  dbName,
  dbType
}: {
  k8sCustomObjects: CustomObjectsApi;
  namespace: string;
  dbName: string;
  dbType: string;
}) {
  try {
    const configurationName = getConfigurationName(dbName, dbType);
    const { body } = (await k8sCustomObjects.getNamespacedCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      namespace,
      'configurations',
      configurationName
    )) as {
      body: any;
    };

    return body;
  } catch (err: any) {
    return null;
  }
}

const offsetToTimezone = (timezone: string) => {
  if (timezone === '+00:00') {
    return 'UTC';
  }
  if (timezone === '+08:00') {
    return 'Asia/Shanghai';
  }
  return timezone;
};

const extractMySqlParameterConfig = (
  mysqlParams: Record<string, unknown>,
  parameterConfig: ParameterConfig
) => {
  let hasParams = false;

  if (mysqlParams['max_connections']) {
    parameterConfig.maxConnections = String(mysqlParams['max_connections']);
    parameterConfig.isMaxConnectionsCustomized = true;
    hasParams = true;
  }

  if (mysqlParams['default-time-zone']) {
    parameterConfig.timeZone = offsetToTimezone(String(mysqlParams['default-time-zone']));
    hasParams = true;
  }

  if (mysqlParams['lower_case_table_names'] !== undefined) {
    parameterConfig.lowerCaseTableNames = String(mysqlParams['lower_case_table_names']);
    hasParams = true;
  }

  return hasParams;
};

export function extractParameterConfigFromConfiguration(configuration: any, dbType: string) {
  if (!configuration?.spec?.configItemDetails) {
    return undefined;
  }

  const parameterConfig: ParameterConfig = {};
  let hasParams = false;

  for (const configItem of configuration.spec.configItemDetails) {
    if (!configItem.configFileParams) continue;

    switch (dbType) {
      case 'postgresql': {
        if (!configItem.configFileParams['postgresql.conf']) break;
        const pgParams = configItem.configFileParams['postgresql.conf'].parameters || {};
        if (pgParams['max_connections']) {
          parameterConfig.maxConnections = String(pgParams['max_connections']);
          parameterConfig.isMaxConnectionsCustomized = true;
          hasParams = true;
        }
        if (pgParams['timezone']) {
          parameterConfig.timeZone = String(pgParams['timezone']);
          hasParams = true;
        }
        break;
      }

      case 'apecloud-mysql':
      case 'mysql': {
        if (!configItem.configFileParams['my.cnf']) break;
        const mysqlParams = configItem.configFileParams['my.cnf'].parameters || {};
        if (extractMySqlParameterConfig(mysqlParams, parameterConfig)) {
          hasParams = true;
        }
        break;
      }

      case 'mongodb': {
        if (!configItem.configFileParams['mongodb.conf']) break;
        const mongoParams = configItem.configFileParams['mongodb.conf'].parameters || {};
        if (mongoParams['net.maxIncomingConnections']) {
          parameterConfig.maxConnections = String(mongoParams['net.maxIncomingConnections']);
          parameterConfig.isMaxConnectionsCustomized = true;
          hasParams = true;
        }
        break;
      }

      case 'redis': {
        if (!configItem.configFileParams['redis.conf']) break;
        const redisParams = configItem.configFileParams['redis.conf'].parameters || {};
        if (redisParams['maxclients']) {
          parameterConfig.maxConnections = String(redisParams['maxclients']);
          parameterConfig.isMaxConnectionsCustomized = true;
          hasParams = true;
        }
        if (redisParams['maxmemory']) {
          parameterConfig.maxmemory = String(redisParams['maxmemory']);
          hasParams = true;
        }
        break;
      }
    }
  }

  return hasParams ? parameterConfig : undefined;
}

export function getEffectiveParameterConfig({
  mode,
  dbType,
  incomingParameterConfig,
  storedParameterConfig
}: {
  mode: ConfigOperation;
  dbType: string;
  incomingParameterConfig?: DBEditType['parameterConfig'];
  storedParameterConfig?: ParameterConfig;
}): ParameterConfig | undefined {
  const incoming = incomingParameterConfig ? { ...incomingParameterConfig } : undefined;

  if (!isMySqlDbType(dbType)) {
    return incoming;
  }

  if (mode === 'create') {
    return incoming;
  }

  // Do not set lower_case_table_names if not creating, preserve original value if editing.
  const effective: ParameterConfig = incoming ? { ...incoming } : {};
  delete effective.lowerCaseTableNames;

  if (storedParameterConfig?.lowerCaseTableNames !== undefined) {
    effective.lowerCaseTableNames = storedParameterConfig.lowerCaseTableNames;
  }

  return Object.keys(effective).length > 0 ? effective : undefined;
}
