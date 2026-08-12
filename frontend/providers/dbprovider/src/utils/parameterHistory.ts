import {
  DBNameLabel,
  DBParameterHistoryDataKey,
  DBParameterHistoryLabel,
  DBReconfigStatusMap,
  ReconfigStatus
} from '@/constants/db';
import type { DBType, OpsRequestItemType } from '@/types/db';
import type { CoreV1Api, V1ConfigMap } from '@kubernetes/client-node';
import { nanoid } from 'nanoid';
import type { ParameterDifference } from './parameterChanges';

type ParameterHistoryData = {
  dbType: DBType;
  status: ReconfigStatus;
  createdAt: string;
  completedAt?: string;
  error?: string;
  differences: ParameterDifference[];
};

export const getParameterHistoryName = (dbName: string) =>
  `${dbName}-param-${Date.now().toString(36)}-${nanoid(4).toLowerCase()}`;

const serializeHistory = (history: ParameterHistoryData) => JSON.stringify(history);

export async function createParameterHistory({
  k8sCore,
  namespace,
  dbName,
  dbType,
  dbUid,
  differences
}: {
  k8sCore: CoreV1Api;
  namespace: string;
  dbName: string;
  dbType: DBType;
  dbUid: string;
  differences: ParameterDifference[];
}) {
  const history: ParameterHistoryData = {
    dbType,
    status: ReconfigStatus.Running,
    createdAt: new Date().toISOString(),
    differences
  };
  const configMap: V1ConfigMap = {
    metadata: {
      name: getParameterHistoryName(dbName),
      namespace,
      labels: {
        [DBNameLabel]: dbName,
        [DBParameterHistoryLabel]: 'true'
      },
      ownerReferences: [
        {
          apiVersion: 'apps.kubeblocks.io/v1alpha1',
          kind: 'Cluster',
          name: dbName,
          uid: dbUid
        }
      ]
    },
    data: { [DBParameterHistoryDataKey]: serializeHistory(history) }
  };

  const { body } = await k8sCore.createNamespacedConfigMap(namespace, configMap);
  return body;
}

export async function completeParameterHistory({
  k8sCore,
  configMap,
  status,
  error
}: {
  k8sCore: CoreV1Api;
  configMap: V1ConfigMap;
  status: ReconfigStatus.Succeed | ReconfigStatus.Failed;
  error?: string;
}) {
  const rawHistory = configMap.data?.[DBParameterHistoryDataKey];
  if (!configMap.metadata?.name || !configMap.metadata.namespace || !rawHistory) return;

  const history = JSON.parse(rawHistory) as ParameterHistoryData;
  const updatedHistory: ParameterHistoryData = {
    ...history,
    status,
    completedAt: new Date().toISOString(),
    ...(error ? { error } : {})
  };
  const updatedConfigMap: V1ConfigMap = {
    ...configMap,
    data: { ...configMap.data, [DBParameterHistoryDataKey]: serializeHistory(updatedHistory) }
  };

  await k8sCore.replaceNamespacedConfigMap(
    configMap.metadata.name,
    configMap.metadata.namespace,
    updatedConfigMap
  );
}

export function adaptParameterHistory(configMap: V1ConfigMap): OpsRequestItemType | undefined {
  const rawHistory = configMap.data?.[DBParameterHistoryDataKey];
  if (!rawHistory || !configMap.metadata?.name) return undefined;

  try {
    const history = JSON.parse(rawHistory) as ParameterHistoryData;
    return {
      id: configMap.metadata.uid || configMap.metadata.name,
      name: configMap.metadata.name,
      namespace: configMap.metadata.namespace || '',
      status: DBReconfigStatusMap[history.status] || DBReconfigStatusMap.Creating,
      startTime: new Date(history.createdAt),
      configurations: history.differences.map((difference) => ({
        parameterName: difference.path,
        oldValue: difference.oldValue,
        newValue: difference.newValue
      }))
    };
  } catch (error) {
    console.error('Failed to parse parameter history:', error);
    return undefined;
  }
}
