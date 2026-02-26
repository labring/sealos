import { MetricsClient } from 'sealos-metrics-sdk';
import type { LaunchpadQueryParams } from 'sealos-metrics-sdk';

export const monitorFetch = async (params: LaunchpadQueryParams, kubeconfig: string) => {
  const metricsConfig = global.AppConfig?.launchpad?.components?.metrics;
  const client = new MetricsClient({
    kubeconfig,
    metricsURL: metricsConfig?.url,
    whitelistKubernetesHosts: metricsConfig?.whitelistKubernetesHosts
  });

  return client.launchpad.query(params);
};
