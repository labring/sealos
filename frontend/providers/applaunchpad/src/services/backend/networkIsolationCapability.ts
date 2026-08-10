import * as k8s from '@kubernetes/client-node';
import type { AppConfigType, NetworkIsolationMode } from '@/types';
import { CheckIsInCluster } from './kubernetes';

export const NETWORK_ISOLATION_CRD_NAME = 'sealosnetworkpolicies.networking.sealos.io';
const CACHE_TTL_MS = 30_000;

type CapabilityCache = {
  enabled: boolean;
  expiresAt: number;
};

let capabilityCache: CapabilityCache | undefined;

export const getNetworkIsolationMode = (
  config: Pick<AppConfigType, 'launchpad'> | undefined = global.AppConfig
): NetworkIsolationMode => config?.launchpad?.networkIsolation?.mode || 'auto';

const readNetworkIsolationCrd = async () => {
  if (!CheckIsInCluster()[0]) return false;

  const kubeConfig = new k8s.KubeConfig();
  kubeConfig.loadFromCluster();
  const api = kubeConfig.makeApiClient(k8s.ApiextensionsV1Api);
  await api.readCustomResourceDefinition(NETWORK_ISOLATION_CRD_NAME);
  return true;
};

export const resetNetworkIsolationCapabilityCache = () => {
  capabilityCache = undefined;
};

export async function isNetworkIsolationAvailable(options?: {
  config?: Pick<AppConfigType, 'launchpad'>;
  now?: number;
  readCrd?: () => Promise<boolean>;
}) {
  if (getNetworkIsolationMode(options?.config) === 'disabled') return false;

  const now = options?.now ?? Date.now();
  if (capabilityCache && capabilityCache.expiresAt > now) {
    return capabilityCache.enabled;
  }

  let enabled = false;
  try {
    enabled = await (options?.readCrd || readNetworkIsolationCrd)();
  } catch (error: any) {
    console.warn(
      JSON.stringify({
        event: 'network_isolation_capability_detection_failed',
        crd: NETWORK_ISOLATION_CRD_NAME,
        statusCode: error?.statusCode || error?.response?.statusCode || error?.body?.code
      })
    );
  }

  capabilityCache = { enabled, expiresAt: now + CACHE_TTL_MS };
  return enabled;
}
