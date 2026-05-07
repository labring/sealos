import { CoreV1Api } from '@kubernetes/client-node';

import { K8sApiDefault } from '@/services/backend/kubernetes';
import type { GpuAliasMap } from '@/types/gpu';

const GPU_CONFIGMAP_NAME = 'node-gpu-info';
const GPU_CONFIGMAP_NAMESPACE = 'node-system';
const GPU_FEATURE_CONFIGMAP_NAME = 'gpu-config';
const GPU_FEATURE_CONFIGMAP_NAMESPACE = 'sealos-system';

const hasConfigMapGpuData = (raw?: string) => {
  if (!raw) return false;
  const value = raw.trim();
  if (!value) return false;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.length > 0;
    }
    if (parsed && typeof parsed === 'object') {
      return Object.keys(parsed).length > 0;
    }
    return Boolean(parsed);
  } catch (_error) {
    // Treat non-json non-empty string as enabled config.
    return true;
  }
};

export async function hasGpuInventoryConfig(): Promise<boolean> {
  try {
    const kc = K8sApiDefault();
    const api = kc.makeApiClient(CoreV1Api);

    const { body } = await api.listNamespacedConfigMap(
      GPU_FEATURE_CONFIGMAP_NAMESPACE,
      undefined,
      undefined,
      undefined,
      `metadata.name=${GPU_FEATURE_CONFIGMAP_NAME}`
    );

    if (!body.items || body.items.length === 0) return false;
    const gpuRaw = body.items[0].data?.gpu;
    return hasConfigMapGpuData(gpuRaw);
  } catch (error) {
    console.log('hasGpuInventoryConfig error', error);
    return false;
  }
}

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
