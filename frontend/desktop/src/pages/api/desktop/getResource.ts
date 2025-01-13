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

    const result = await kc.makeApiClient(k8s.CoreV1Api).listNamespacedPod(namespace);

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
        const limits = container?.resources.limits as {
          cpu: string;
          memory: string;
          ['nvidia.com/gpu']?: string;
        };
        totalCpuLimits += parseResourceValue(limits.cpu);
        totalMemoryLimits += parseResourceValue(limits.memory);

        totalGpuCount += Number(limits['nvidia.com/gpu'] || 0);
      }

      if (!pod?.spec?.volumes) continue;
      for (const volume of pod.spec.volumes) {
        if (!volume.persistentVolumeClaim?.claimName) continue;
        const pvcName = volume.persistentVolumeClaim.claimName;
        try {
          const pvc = await kc
            .makeApiClient(k8s.CoreV1Api)
            .readNamespacedPersistentVolumeClaim(pvcName, namespace);
          const storage = pvc?.body?.spec?.resources?.requests?.storage || '0';
          totalStorageRequests += parseResourceValue(storage);
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
        totalGpuCount
        // result: result.body.items
      }
    });
  } catch (err) {
    jsonRes(res, { code: 500, data: err });
  }
}

function parseResourceValue(value: string) {
  const unit = value.match(/[a-zA-Z]+$/);
  const number = parseFloat(value);
  if (!unit) return number;

  switch (unit[0]) {
    case 'm':
      return number / 1000; // For CPU millicores to cores
    case 'Ki':
      return number / (1024 * 1024); // For Ki to Gi
    case 'Mi':
      return number / 1024; // For Mi to Gi
    case 'Gi':
      return number; // Already in Gi
    default:
      return number; // Assume raw number if no unit
  }
}
