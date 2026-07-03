import { verifyAccessToken } from '@/services/backend/auth';
import { getUserKubeconfigNotPatch } from '@/services/backend/kubernetes/admin';
import { K8sApi } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';
import * as k8s from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'failed to get info' });
    const namespace = payload.workspaceId;
    const _kc = await getUserKubeconfigNotPatch(payload.userCrName);
    if (!_kc) return jsonRes(res, { code: 404, message: 'user is not found' });
    const realKc = switchKubeconfigNamespace(_kc, namespace);
    const kc = K8sApi(realKc);
    if (!kc) return jsonRes(res, { code: 404, message: 'The kubeconfig is not found' });

    const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
    const result = await coreV1Api.listNamespacedPod(namespace);
    const workspaceQuota = await getWorkspaceQuota(coreV1Api, namespace);

    let totalCpuLimits = 0;
    let totalMemoryLimits = 0;
    let totalStorageRequests = 0;
    let runningPodCount = 0;
    let totalGpuCount = 0;
    let totalPodCount = 0;

    for (const pod of result.body.items) {
      if (pod.status?.phase === 'Succeeded') continue;
      if (!pod?.spec) continue;

      totalPodCount++;

      if (pod.status?.phase !== 'Running') continue;

      runningPodCount++;

      for (const container of pod?.spec.containers) {
        if (!container?.resources) continue;
        const limits = container?.resources.limits as
          | {
              cpu?: string;
              memory?: string;
              ['nvidia.com/gpu']?: string;
            }
          | undefined;
        if (!limits) continue;
        totalCpuLimits += parseResourceValue(limits.cpu, 'cpu');
        totalMemoryLimits += parseResourceValue(limits.memory, 'memory');

        totalGpuCount += Number(limits['nvidia.com/gpu'] || 0);
      }

      if (!pod?.spec?.volumes) continue;
      for (const volume of pod.spec.volumes) {
        if (!volume.persistentVolumeClaim?.claimName) continue;
        const pvcName = volume.persistentVolumeClaim.claimName;
        try {
          const pvc = await coreV1Api.readNamespacedPersistentVolumeClaim(pvcName, namespace);
          const storage = pvc?.body?.spec?.resources?.requests?.storage || '0';
          totalStorageRequests += parseResourceValue(storage, 'storage');
        } catch (error) {}
      }
    }

    jsonRes(res, {
      data: {
        totalCpu: totalCpuLimits.toFixed(2),
        totalMemory: totalMemoryLimits.toFixed(2),
        totalStorage: totalStorageRequests.toFixed(2),
        runningPodCount,
        totalPodCount,
        totalGpuCount,
        workspaceQuota
        // result: result.body.items
      }
    });
  } catch (err) {
    jsonRes(res, { code: 500, data: err });
  }
}

type WorkspaceQuotaType = 'cpu' | 'memory' | 'storage' | 'gpu' | 'nodeport';
type QuantityMap = Record<string, string | number | undefined>;

type WorkspaceQuotaItem = {
  type: WorkspaceQuotaType;
  used: number;
  limit: number;
  available: number;
  usagePercent: number;
};

const quotaResources: {
  type: WorkspaceQuotaType;
  hardKeys: string[];
  usedKeys: string[];
  resourceType: 'cpu' | 'memory' | 'storage' | 'count';
}[] = [
  {
    type: 'cpu',
    hardKeys: ['limits.cpu', 'requests.cpu', 'cpu'],
    usedKeys: ['limits.cpu', 'requests.cpu', 'cpu'],
    resourceType: 'cpu'
  },
  {
    type: 'memory',
    hardKeys: ['limits.memory', 'requests.memory', 'memory'],
    usedKeys: ['limits.memory', 'requests.memory', 'memory'],
    resourceType: 'memory'
  },
  {
    type: 'storage',
    hardKeys: ['requests.storage'],
    usedKeys: ['requests.storage'],
    resourceType: 'storage'
  },
  {
    type: 'gpu',
    hardKeys: ['requests.nvidia.com/gpu', 'limits.nvidia.com/gpu', 'nvidia.com/gpu'],
    usedKeys: ['requests.nvidia.com/gpu', 'limits.nvidia.com/gpu', 'nvidia.com/gpu'],
    resourceType: 'count'
  },
  {
    type: 'nodeport',
    hardKeys: ['services.nodeports'],
    usedKeys: ['services.nodeports'],
    resourceType: 'count'
  }
];

async function getWorkspaceQuota(
  coreV1Api: k8s.CoreV1Api,
  namespace: string
): Promise<WorkspaceQuotaItem[]> {
  try {
    const {
      body: { status }
    } = await coreV1Api.readNamespacedResourceQuota(`quota-${namespace}`, namespace);
    const hard = (status?.hard || {}) as QuantityMap;
    const used = (status?.used || {}) as QuantityMap;

    return quotaResources
      .map(({ type, hardKeys, usedKeys, resourceType }) => {
        const limit = getQuotaValue(hard, hardKeys, resourceType);
        const usedValue = getQuotaValue(used, usedKeys, resourceType);
        const available = Math.max(limit - usedValue, 0);
        return {
          type,
          used: roundResourceValue(usedValue, resourceType),
          limit: roundResourceValue(limit, resourceType),
          available: roundResourceValue(available, resourceType),
          usagePercent: limit > 0 ? Math.min(Math.round((usedValue / limit) * 100), 100) : 0
        };
      })
      .filter((item) => item.limit > 0 || item.used > 0);
  } catch (error) {
    return [];
  }
}

function getQuotaValue(
  values: QuantityMap,
  keys: string[],
  resourceType: 'cpu' | 'memory' | 'storage' | 'count'
) {
  const value = keys.map((key) => values[key]).find((item) => item !== undefined && item !== '');
  if (value === undefined) return 0;
  if (resourceType === 'count') return Number(value || 0);

  return parseResourceValue(value, resourceType);
}

function roundResourceValue(value: number, resourceType: 'cpu' | 'memory' | 'storage' | 'count') {
  if (resourceType === 'count') return Math.round(value);
  return Number(value.toFixed(2));
}

function parseResourceValue(
  value: string | number | undefined,
  resourceType: 'cpu' | 'memory' | 'storage'
) {
  if (!value) return 0;

  const resourceValue = String(value);
  const unit = resourceValue.match(/[a-zA-Z]+$/);
  const number = parseFloat(resourceValue);
  if (Number.isNaN(number)) return 0;

  if (!unit) return number;

  const unitStr = unit[0];

  switch (unitStr) {
    case 'm':
      if (resourceType === 'cpu') {
        // CPU millicores to cores
        return number / 1000;
      } else {
        // Memory/Storage: millibytes to Gi
        return number / (1000 * 1024 * 1024 * 1024);
      }
    case 'Ki':
      return number / (1024 * 1024); // Ki to Gi
    case 'Mi':
      return number / 1024; // Mi to Gi
    case 'Gi':
      return number; // Already in Gi
    case 'Ti':
      return number * 1024; // Ti to Gi
    default:
      return number; // Assume raw number
  }
}
