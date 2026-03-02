import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { monitorFetch } from '@/services/monitorFetch';
import { MonitorDataResult, MonitorQueryKey } from '@/types/monitor';
import type { NextApiRequest, NextApiResponse } from 'next';
import type {
  LaunchpadMetricType,
  LaunchpadQueryParams,
  LaunchpadQueryResult
} from 'sealos-metrics-sdk';

const normalizeQueryParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const adaptChartData = (
  data: LaunchpadQueryResult,
  metricName: 'pod' | 'persistentvolumeclaim'
): MonitorDataResult[] =>
  data.data.result.map((item) => ({
    name: item.metric[metricName] || item.metric.pod || item.metric.persistentvolumeclaim,
    xData: item.values?.map((value) => Number(value[0])) ?? [],
    yData: item.values?.map((value) => Number.parseFloat(value[1]).toFixed(2)) ?? []
  }));

const AdapterChartData: Record<
  keyof MonitorQueryKey,
  (data: LaunchpadQueryResult) => MonitorDataResult[]
> = {
  disk: (data) => adaptChartData(data, 'persistentvolumeclaim'),
  cpu: (data) => adaptChartData(data, 'pod'),
  memory: (data) => adaptChartData(data, 'pod'),
  average_cpu: (data) => adaptChartData(data, 'pod'),
  average_memory: (data) => adaptChartData(data, 'pod'),
  storage: (data) => adaptChartData(data, 'persistentvolumeclaim')
};

const queryTypeMap: Record<keyof MonitorQueryKey, LaunchpadMetricType> = {
  cpu: 'cpu',
  memory: 'memory',
  disk: 'disk',
  average_cpu: 'average_cpu',
  average_memory: 'average_memory',
  storage: 'disk'
};

const alignMonitorData = (dataArray: MonitorDataResult[]): MonitorDataResult[] => {
  if (dataArray.length === 0) return dataArray;
  const maxLength = Math.max(...dataArray.map((item) => item.xData.length));
  const baseItem = dataArray.find((item) => item.xData.length === maxLength);
  if (!baseItem) return dataArray;

  return dataArray.map((item) => {
    if (item.xData.length === maxLength) {
      return item;
    }
    const paddingLength = maxLength - item.xData.length;
    const paddedXData = [...baseItem.xData.slice(0, paddingLength), ...item.xData];
    const paddedYData = [...new Array(paddingLength).fill('0'), ...item.yData];

    return {
      name: item.name,
      xData: paddedXData,
      yData: paddedYData
    };
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const kubeconfig = await authSession(req.headers);
    const { namespace } = await getK8s({
      kubeconfig: kubeconfig
    });

    const { queryName, queryKey, start, end, step = '1m', pvcName } = req.query;
    const normalizedQueryName = normalizeQueryParam(queryName as string | string[] | undefined);
    const normalizedQueryKey = normalizeQueryParam(queryKey as string | string[] | undefined) as
      | keyof MonitorQueryKey
      | undefined;
    const normalizedStep = normalizeQueryParam(step as string | string[] | undefined) || '1m';
    const normalizedPvcName = normalizeQueryParam(pvcName as string | string[] | undefined);

    if (!normalizedQueryName || !normalizedQueryKey || !queryTypeMap[normalizedQueryKey]) {
      return jsonRes(res, {
        code: 400,
        message: 'Invalid monitor query params'
      });
    }

    // One hour of monitoring data
    const endTime = end
      ? Number(normalizeQueryParam(end as string | string[] | undefined))
      : Date.now();
    const startTime = start
      ? Number(normalizeQueryParam(start as string | string[] | undefined))
      : endTime - 60 * 60 * 1000;

    const params: LaunchpadQueryParams = {
      type: queryTypeMap[normalizedQueryKey],
      podName: normalizedQueryName,
      namespace: namespace,
      range: {
        start: Math.floor(startTime / 1000),
        end: Math.floor(endTime / 1000),
        step: normalizedStep
      },
      ...(normalizedPvcName && { pvcName: normalizedPvcName })
    };

    const result: MonitorDataResult[] = await monitorFetch(params, kubeconfig).then((sdkRes) => {
      const adaptedData = AdapterChartData[normalizedQueryKey](sdkRes as LaunchpadQueryResult);

      return alignMonitorData(adaptedData);
    });

    jsonRes(res, {
      code: 200,
      data: result
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error: error
    });
  }
}
