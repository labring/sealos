import { MetricsClient } from 'sealos-metrics-sdk';
import type { LaunchpadQueryParams } from 'sealos-metrics-sdk';

export const monitorFetch = async (params: LaunchpadQueryParams, kubeconfig: string) => {
  const metricsURL = process.env.METRICS_URL;
  const client = new MetricsClient({
    kubeconfig,
    metricsURL
  });

  return client.launchpad.query(params);
};
