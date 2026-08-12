import type { DBEditType } from '@/types/db';

type ParameterConfig = NonNullable<DBEditType['parameterConfig']>;

export type ParameterDifference = {
  path: string;
  currentPath?: string;
  oldValue: string;
  newValue: string;
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
    if (String(oldValue ?? '') === String(newValue)) return [];

    return [
      {
        path: paths.requested,
        currentPath: paths.current,
        oldValue: String(oldValue ?? ''),
        newValue: String(newValue)
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

export function applyParameterDifferences({
  configuration,
  configItemName,
  configMapKey,
  differences
}: {
  configuration: any;
  configItemName: string;
  configMapKey: string;
  differences: ParameterDifference[];
}) {
  const configItem = configuration?.spec?.configItemDetails?.find(
    (item: any) => item.name === configItemName
  );

  if (!configItem) {
    throw new Error(`Configuration item not found: ${configItemName}`);
  }

  configItem.configFileParams ||= {};
  configItem.configFileParams[configMapKey] ||= {};
  configItem.configFileParams[configMapKey].parameters ||= {};

  for (const difference of differences) {
    configItem.configFileParams[configMapKey].parameters[difference.path] = difference.newValue;
  }

  return configuration;
}
