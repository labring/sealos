import { NextRequest } from 'next/server';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { monitorFetch } from '@/services/monitorFetch';
import { MonitorDataResult, MonitorQueryKey } from '@/types/monitor';
import type { LaunchpadQueryParams, LaunchpadQueryResult } from 'sealos-metrics-sdk';

const AdapterChartData: Record<
  keyof MonitorQueryKey,
  (data: LaunchpadQueryResult) => MonitorDataResult[]
> = {
  disk: (data: LaunchpadQueryResult) => {
    const newDataArray = data.data.result.map((item) => {
      let name = item.metric.pod;
      let xData = item.values?.map((value) => value[0]) ?? [];
      let yData = item.values?.map((value) => (parseFloat(value[1]) * 100).toFixed(2)) ?? [];
      return {
        name: name,
        xData: xData,
        yData: yData
      };
    });
    return newDataArray;
  },
  cpu: (data: LaunchpadQueryResult) => {
    const newDataArray = data.data.result.map((item) => {
      let name = item.metric.pod;
      let xData = item.values?.map((value) => value[0]) ?? [];
      let yData = item.values?.map((value) => (parseFloat(value[1]) * 100).toFixed(2)) ?? [];
      return {
        name: name,
        xData: xData,
        yData: yData
      };
    });
    return newDataArray;
  },
  memory: (data: LaunchpadQueryResult) => {
    const newDataArray = data.data.result.map((item) => {
      let name = item.metric.pod;
      let xData = item.values?.map((value) => value[0]) ?? [];
      let yData = item.values?.map((value) => (parseFloat(value[1]) * 100).toFixed(2)) ?? [];
      return {
        name: name,
        xData: xData,
        yData: yData
      };
    });
    return newDataArray;
  },
  average_cpu: (data: LaunchpadQueryResult) => {
    const newDataArray = data.data.result.map((item) => {
      let name = item.metric.pod;
      let xData = item.values?.map((value) => value[0]) ?? [];
      let yData = item.values?.map((value) => parseFloat(value[1]).toFixed(2)) ?? [];
      return {
        name: name,
        xData: xData,
        yData: yData
      };
    });
    return newDataArray;
  },
  average_memory: (data: LaunchpadQueryResult) => {
    const newDataArray = data.data.result.map((item) => {
      let name = item.metric.pod;
      let xData = item.values?.map((value) => value[0]) ?? [];
      let yData = item.values?.map((value) => parseFloat(value[1]).toFixed(2)) ?? [];
      return {
        name: name,
        xData: xData,
        yData: yData
      };
    });
    return newDataArray;
  }
};

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const headerList = req.headers;
    const { searchParams } = req.nextUrl;
    const queryName = searchParams.get('queryName') as string;
    const queryKey = searchParams.get('queryKey') as keyof MonitorQueryKey;
    const start = searchParams.get('start') as string;
    const end = searchParams.get('end') as string;
    const step = searchParams.get('step') as string | '1m';

    const kubeconfig = await authSession(headerList);

    const { namespace } = await getK8s({
      kubeconfig: kubeconfig
    });

    // One hour of monitoring data
    const endTime = end ? Number(end) : Date.now();
    const startTime = start ? Number(start) : endTime - 60 * 60 * 1000;

    const params: LaunchpadQueryParams = {
      type: queryKey,
      podName: queryName,
      namespace: namespace,
      range: {
        start: Math.floor(startTime / 1000),
        end: Math.floor(endTime / 1000),
        step: step
      }
    };

    const result = await monitorFetch(params, kubeconfig).then((res) => {
      // @ts-ignore
      return AdapterChartData[queryKey]
        ? // @ts-ignore
          AdapterChartData[queryKey](res as LaunchpadQueryResult)
        : res;
    });

    return jsonRes({
      code: 200,
      data: result
    });
  } catch (error) {
    return jsonRes({
      code: 500,
      error: error
    });
  }
}
