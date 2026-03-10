import { MetricsClient } from 'sealos-metrics-sdk';
import type { LaunchpadQueryParams } from 'sealos-metrics-sdk';
import { Config } from '@/src/config';

export const monitorFetch = async (params: LaunchpadQueryParams, kubeconfig: string) => {
  const metricsURL = Config().devbox.components.monitoring.url;
  const client = new MetricsClient({
    kubeconfig,
    metricsURL
  });

  return client.launchpad.query(params);
};
