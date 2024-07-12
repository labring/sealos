import { authSession } from '@/service/backend/auth';
import { GetUserDefaultNameSpace } from '@/service/backend/kubernetes';
import { jsonRes } from '@/service/backend/response';
import * as k8s from '@kubernetes/client-node';
import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, resp: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);

    // get user account payment amount
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(resp, { code: 403, message: 'user null' });
    }
    const namespace = kc.contexts[0].namespace || GetUserDefaultNameSpace(user.name);
    const quota = await getUserQuota(kc, namespace);
    return jsonRes(resp, {
      code: 200,
      data: { quota }
    });
  } catch (error) {
    console.log(error);
    jsonRes(resp, { code: 500, message: 'get quota error' });
  }
}
export type UserQuotaItemType = {
  type: 'cpu' | 'memory' | 'storage' | 'gpu';
  used: number;
  limit: number;
};
/**
 * cpu format
 */
export const cpuFormatToM = (cpu: string) => {
  if (!cpu || cpu === '0') {
    return 0;
  }
  let value = parseFloat(cpu);

  if (/n/gi.test(cpu)) {
    value = value / 1000 / 1000;
  } else if (/u/gi.test(cpu)) {
    value = value / 1000;
  } else if (/m/gi.test(cpu)) {
    value = value;
  } else {
    value = value * 1000;
  }
  if (value < 0.1) return 0;
  return Number(value.toFixed(4));
};

/**
 * memory format
 */
export const memoryFormatToMi = (memory: string) => {
  if (!memory || memory === '0') {
    return 0;
  }

  let value = parseFloat(memory);

  if (/Ki/gi.test(memory)) {
    value = value / 1024;
  } else if (/Mi/gi.test(memory)) {
    value = value;
  } else if (/Gi/gi.test(memory)) {
    value = value * 1024;
  } else if (/Ti/gi.test(memory)) {
    value = value * 1024 * 1024;
  } else {
    value = 0;
  }

  return Number(value.toFixed(2));
};

export async function getUserQuota(
  kc: k8s.KubeConfig,
  namespace: string
): Promise<UserQuotaItemType[]> {
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

  const data = await k8sApi.readNamespacedResourceQuota(`quota-${namespace}`, namespace);
  const status = data?.body?.status;
  if (!status) return [];
  return [
    {
      type: 'cpu',
      limit: cpuFormatToM(status?.hard?.['limits.cpu'] || '') / 1000,
      used: cpuFormatToM(status?.used?.['limits.cpu'] || '') / 1000
    },
    {
      type: 'memory',
      limit: memoryFormatToMi(status?.hard?.['limits.memory'] || '') / 1024,
      used: memoryFormatToMi(status?.used?.['limits.memory'] || '') / 1024
    },
    {
      type: 'storage',
      limit: memoryFormatToMi(status?.hard?.['requests.storage'] || '') / 1024,
      used: memoryFormatToMi(status?.used?.['requests.storage'] || '') / 1024
    },
    {
      type: 'gpu',
      limit: Number(status?.hard?.['limits.nvidia.com/gpu'] || 0),
      used: Number(status?.used?.['limits.nvidia.com/gpu'] || 0)
    }
  ];
}
