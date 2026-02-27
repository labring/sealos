import { BaseQueryParams, MetricResult } from './common';

export type LaunchpadMetricType = 'cpu' | 'memory' | 'average_cpu' | 'average_memory' | 'disk';

export interface LaunchpadQueryParams extends BaseQueryParams {
  type: LaunchpadMetricType;
  podName: string;
  pvcName?: string;
}

export interface LaunchpadQueryResult {
  status: string;
  isPartial: boolean;
  data: {
    resultType: string;
    result: MetricResult[];
  };
  stats: {
    seriesFetched: string;
    executionTimeMsec: number;
  };
}
