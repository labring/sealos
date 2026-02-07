import { CoreV1Api } from '@kubernetes/client-node';

import { K8sApiDefault } from '@/services/backend/kubernetes';
import type { GpuAliasMap } from '@/types/gpu';

const GPU_CONFIGMAP_NAME = 'node-gpu-info';
const GPU_CONFIGMAP_NAMESPACE = 'node-system';

export async function getGpuAliasMap(): Promise<GpuAliasMap> {
  try {
    const kc = K8sApiDefault();
    const api = kc.makeApiClient(CoreV1Api);

    const { body } = await api.listNamespacedConfigMap(
      GPU_CONFIGMAP_NAMESPACE,
      undefined,
      undefined,
      undefined,
      `metadata.name=${GPU_CONFIGMAP_NAME}`
    );

    if (!body.items || body.items.length === 0) return {};
    const aliasRaw = body.items[0].data?.alias;
    if (!aliasRaw) return {};

    const parsed = JSON.parse(aliasRaw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as GpuAliasMap;
  } catch (error) {
    console.log('getGpuAliasMap error', error);
    return {};
  }
}
