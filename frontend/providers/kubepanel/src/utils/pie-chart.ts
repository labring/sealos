import { WorkloadStatusData } from '@/components/kubepanel-views/workload/overview/status-chart';
import { Dictionary, capitalize, entries } from 'lodash';

export const convertToPieChartStatusData = (dict: Dictionary<number>) => {
  return entries(dict)
    .filter(([_, value]) => value !== 0)
    .map(
      ([key, value]) =>
        ({
          type: capitalize(key),
          value
        }) as WorkloadStatusData
    );
};
