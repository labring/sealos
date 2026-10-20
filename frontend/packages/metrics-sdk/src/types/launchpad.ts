import { BaseQueryParams, QueryResponse } from './common';

export type NetworkMetricType = 'network_service_request_count' | 'network_service_request_percent';

export type LaunchpadMetricType =
  | 'cpu'
  | 'memory'
  | 'average_cpu'
  | 'average_memory'
  | 'disk'
  | 'storage'
  | 'gpu'
  | 'gpu_memory'
  | NetworkMetricType;

export interface LaunchpadQueryParams extends BaseQueryParams {
  type: LaunchpadMetricType;
  /** Required for CPU, memory and GPU metrics. */
  podName?: string;
  /** Required for disk/storage metrics. */
  pvcName?: string;
  /** Required for network metrics. Short names are scoped to namespace. */
  service?: string;
  /** Required for network metrics. */
  port?: number | string;
}

export interface LaunchpadQueryResult extends QueryResponse {
  isPartial?: boolean;
  stats?: {
    seriesFetched?: string;
    executionTimeMsec?: number | string;
    execTime?: number;
  };
}
