import {
  DBNameLabel,
  DBParameterHistoryDataKey,
  DBParameterHistoryLabel,
  DBReconfigStatusMap,
  ReconfigStatus
} from '@/constants/db';
import type { DBType, OpsRequestItemType } from '@/types/db';
import type { CoreV1Api, V1ConfigMap } from '@kubernetes/client-node';
import { customAlphabet } from 'nanoid';
import type { ParameterDifference } from './parameterChanges';
import { areParameterValuesApplied } from './parameterChanges';

export const ParameterHistoryTimeoutMs = 5 * 60 * 1000;
const createHistorySuffix = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 4);

export type ParameterHistoryData = {
  dbType: DBType;
  status: ReconfigStatus;
  createdAt: string;
  completedAt?: string;
  error?: string;
  opsRequestName?: string;
  differences: ParameterDifference[];
};

export const getParameterHistoryName = (dbName: string) =>
  `${dbName}-param-${Date.now().toString(36)}-${createHistorySuffix()}`;

const serializeHistory = (history: ParameterHistoryData) => JSON.stringify(history);

export function resolveParameterHistoryStatus({
  history,
  currentValues = {},
  now = Date.now(),
  timeoutMs = ParameterHistoryTimeoutMs
}: {
  history: ParameterHistoryData;
  currentValues?: Record<string, string>;
  now?: number;
  timeoutMs?: number;
}): ReconfigStatus {
  if (history.status !== ReconfigStatus.Running) return history.status;
  if (areParameterValuesApplied(currentValues, history.differences)) return ReconfigStatus.Succeed;
  return now - new Date(history.createdAt).getTime() >= timeoutMs
    ? ReconfigStatus.Failed
    : ReconfigStatus.Running;
}

export function readParameterHistory(configMap: V1ConfigMap): ParameterHistoryData | undefined {
  const rawHistory = configMap.data?.[DBParameterHistoryDataKey];
  if (!rawHistory) return undefined;

  try {
    return JSON.parse(rawHistory) as ParameterHistoryData;
  } catch (error) {
    console.error('Failed to parse parameter history:', error);
    return undefined;
  }
}

export async function createParameterHistory({
  k8sCore,
  namespace,
  dbName,
  dbType,
  dbUid,
  differences,
  opsRequestName
}: {
  k8sCore: CoreV1Api;
  namespace: string;
  dbName: string;
  dbType: DBType;
  dbUid: string;
  differences: ParameterDifference[];
  opsRequestName?: string;
}) {
  const history: ParameterHistoryData = {
    dbType,
    status: ReconfigStatus.Running,
    createdAt: new Date().toISOString(),
    ...(opsRequestName ? { opsRequestName } : {}),
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
  const history = readParameterHistory(configMap);
  if (!history || !configMap.metadata?.name) return undefined;

  try {
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
