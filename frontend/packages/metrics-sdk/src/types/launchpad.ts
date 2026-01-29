import { BaseQueryParams, MetricResult } from './common';

export enum LaunchpadMetric {
  CPU = 'cpu',
  Memory = 'memory',
  AverageCPU = 'average_cpu',
  AverageMemory = 'average_memory',
  Storage = 'storage'
}

export interface LaunchpadQueryParams extends BaseQueryParams {
  type: LaunchpadMetric;
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
