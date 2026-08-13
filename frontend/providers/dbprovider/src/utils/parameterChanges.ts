import type { DBEditType } from '@/types/db';

type ParameterConfig = NonNullable<DBEditType['parameterConfig']>;

export const mergeRedisParameterValues = (
  configMapValues: Record<string, string>,
  configurationValues: Record<string, string | number>
): Record<string, string> =>
  Object.fromEntries(
    Object.entries({ ...configMapValues, ...configurationValues }).map(([key, value]) => [
      key,
      String(value)
    ])
  );

export const getDefaultMaxConnections = (dbType: string, cpu: number, memory: number) => {
  const cpuCores = cpu / 1000;
  const memoryGB = memory / 1024;
  let score = 0;
  if (['postgresql', 'mongodb', 'apecloud-mysql'].includes(dbType)) {
    score = Math.min(cpuCores * 400 + memoryGB * 300, 100000);
  } else if (dbType === 'redis') {
    score = Math.min(cpuCores * 1000 + memoryGB * 500, 100000);
  }
  return Math.floor(score);
};

export type ParameterDifference = {
  path: string;
  currentPath?: string;
  oldValue: string;
  newValue: string;
};

export const toKubeBlocksParameterPairs = (
  differences: Pick<ParameterDifference, 'path' | 'newValue'>[]
) => differences.map(({ path, newValue }) => ({ key: path, value: newValue }));

export const getPostgreSQLConfigSpecMetadata = (majorVersion: string) => ({
  constraintRef: `postgresql${majorVersion}-cc`,
  keys: ['postgresql.conf']
});

type PostgreSQLConfigItem = {
  name?: string;
  configSpec?: {
    constraintRef?: string;
    keys?: string[];
  };
};

export const getPostgreSQLConfigSpecPatch = ({
  dbVersion,
  configItemDetails
}: {
  dbVersion: string;
  configItemDetails: PostgreSQLConfigItem[];
}) => {
  const majorVersion = dbVersion.replace(/^postgresql-/, '').split('.')[0];
  const expected = getPostgreSQLConfigSpecMetadata(majorVersion);
  const index = configItemDetails.findIndex(({ name }) => name === 'postgresql-configuration');
  if (index < 0) {
    throw new Error('PostgreSQL configuration item not found');
  }

  const configSpec = configItemDetails[index].configSpec;
  if (!configSpec) {
    throw new Error('PostgreSQL configSpec not found');
  }

  const basePath = `/spec/configItemDetails/${index}/configSpec`;
  const patch = [];
  if (configSpec.constraintRef !== expected.constraintRef) {
    patch.push({
      op: 'add',
      path: `${basePath}/constraintRef`,
      value: expected.constraintRef
    });
  }
  if (
    configSpec.keys?.length !== expected.keys.length ||
    !expected.keys.every((key) => configSpec.keys?.includes(key))
  ) {
    patch.push({
      op: 'add',
      path: `${basePath}/keys`,
      value: expected.keys
    });
  }
  return patch;
};

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

const normalizeMySQLTimeZone = (value: string) =>
  value === 'UTC' || value === '+00:00'
    ? '+00:00'
    : value === 'Asia/Shanghai' || value === '+08:00'
      ? '+08:00'
      : value;

export function getParameterConfigFromRuntimeValues({
  dbType,
  currentValues,
  dynamicMaxConnections
}: {
  dbType: string;
  currentValues: Record<string, string>;
  dynamicMaxConnections: number;
}): DBEditType['parameterConfig'] {
  const paths = parameterPathsByDbType[dbType];
  if (!paths) return undefined;

  const parameterConfig: ParameterConfig = {};
  for (const [field, path] of Object.entries(paths)) {
    const value = currentValues[path.current];
    if (value !== undefined) {
      parameterConfig[field as keyof ParameterConfig] = String(value) as never;
    }
  }

  if (parameterConfig.maxConnections !== undefined) {
    parameterConfig.isMaxConnectionsCustomized =
      parameterConfig.maxConnections !== dynamicMaxConnections.toString();
  }

  if (dbType === 'apecloud-mysql') {
    parameterConfig.timeZone =
      parameterConfig.timeZone === '+00:00'
        ? 'UTC'
        : parameterConfig.timeZone === '+08:00'
          ? 'Asia/Shanghai'
          : parameterConfig.timeZone;
  }

  return Object.keys(parameterConfig).length > 0 ? parameterConfig : undefined;
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
}): ParameterDifference[] {
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
    const comparableOldValue =
      dbType === 'apecloud-mysql' && key === 'timeZone'
        ? normalizeMySQLTimeZone(String(oldValue ?? ''))
        : String(oldValue ?? '');
    const comparableNewValue =
      dbType === 'apecloud-mysql' && key === 'timeZone'
        ? normalizeMySQLTimeZone(String(newValue))
        : String(newValue);
    if (comparableOldValue === comparableNewValue) return [];

    return [
      {
        path: paths.requested,
        currentPath: paths.current,
        oldValue: String(oldValue ?? ''),
        newValue: comparableNewValue
      }
    ];
  });
}

export const areParameterValuesApplied = (
  currentValues: Record<string, string>,
  differences: ParameterDifference[]
) =>
  differences.every(
    (difference) =>
      String(currentValues[difference.currentPath || difference.path] ?? '') === difference.newValue
  );
