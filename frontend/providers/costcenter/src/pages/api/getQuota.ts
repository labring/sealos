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
    const namespace =
      (typeof req.body?.namespace === 'string' && req.body.namespace) ||
      kc.contexts[0].namespace ||
      GetUserDefaultNameSpace(user.name);
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
  type:
    | 'cpu'
    | 'memory'
    | 'storage'
    | 'ephemeral-storage'
    | 'gpu'
    | 'pods'
    | 'services.nodeports'
    | 'objectstorage/bucket'
    | 'objectstorage/size';
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
  } else if (/k/gi.test(cpu)) {
    // k means 1000 cores, convert to millicores: 1k = 1000 * 1000m = 1000000m
    value = value * 1000 * 1000;
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

export const storageQuantityToMi = (quantity: string) => {
  if (!quantity || quantity === '0') return 0;
  const s = String(quantity).trim();
  if (/[KMGT]i/i.test(s)) return memoryFormatToMi(s);
  if (/^\d+\.?\d*$/.test(s)) return Number((parseFloat(s) / (1024 * 1024)).toFixed(2));
  return memoryFormatToMi(s);
};

export const countQuantityToNumber = (quantity: string) => {
  if (!quantity || quantity === '0') return 0;
  const s = String(quantity).trim();
  const value = parseFloat(s);
  if (Number.isNaN(value)) return 0;
  if (/k$/i.test(s)) return value * 1000;
  if (/M$/.test(s)) return value * 1000 * 1000;
  return value;
};

export async function getUserQuota(
  kc: k8s.KubeConfig,
  namespace: string
): Promise<UserQuotaItemType[]> {
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

  const data = await k8sApi.readNamespacedResourceQuota(`quota-${namespace}`, namespace);
  const status = data?.body?.status;
  if (!status) return [];
  const hard = status.hard || {};
  const used = status.used || {};
  const hasQuota = (key: string) => Object.prototype.hasOwnProperty.call(hard, key);
  const quota: UserQuotaItemType[] = [];

  const addQuota = (
    type: UserQuotaItemType['type'],
    key: string,
    parser: (quantity: string) => number
  ) => {
    if (!hasQuota(key)) return;
    quota.push({
      type,
      limit: parser(hard[key] || ''),
      used: parser(used[key] || '')
    });
  };

  addQuota('cpu', 'limits.cpu', (value) => cpuFormatToM(value) / 1000);
  addQuota('memory', 'limits.memory', (value) => memoryFormatToMi(value) / 1024);
  addQuota('storage', 'requests.storage', (value) => storageQuantityToMi(value) / 1024);
  addQuota('ephemeral-storage', 'limits.ephemeral-storage', (value) => storageQuantityToMi(value) / 1024);

  const gpuKey = hasQuota('requests.nvidia.com/gpu')
    ? 'requests.nvidia.com/gpu'
    : 'limits.nvidia.com/gpu';
  addQuota('gpu', gpuKey, (value) => Number(value || 0));

  addQuota('pods', 'pods', countQuantityToNumber);
  addQuota('services.nodeports', 'services.nodeports', countQuantityToNumber);
  addQuota('objectstorage/bucket', 'objectstorage/bucket', countQuantityToNumber);
  addQuota('objectstorage/size', 'objectstorage/size', (value) => storageQuantityToMi(value) / 1024);

  return quota;
}
