import { NextRequest } from 'next/server';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { monitorFetch } from '@/services/monitorFetch';
import { MonitorDataResult, MonitorQueryKey, MonitorServiceResult } from '@/types/monitor';

const AdapterChartData: Record<
  keyof MonitorQueryKey,
  (data: MonitorServiceResult) => MonitorDataResult[]
> = {
  disk: (data: MonitorServiceResult) => {
    const newDataArray = data.data.result.map((item) => {
      let name = item.metric.pod;
      let xData = item.values.map((value) => value[0]);
      let yData = item.values.map((value) => (parseFloat(value[1]) * 100).toFixed(2));
      return {
        name: name,
        xData: xData,
        yData: yData
      };
    });
    return newDataArray;
  },
  cpu: (data: MonitorServiceResult) => {
    const newDataArray = data.data.result.map((item) => {
      let name = item.metric.pod;
      let xData = item.values.map((value) => value[0]);
      let yData = item.values.map((value) => (parseFloat(value[1]) * 100).toFixed(2));
      return {
        name: name,
        xData: xData,
        yData: yData
      };
    });
    return newDataArray;
  },
  memory: (data: MonitorServiceResult) => {
    const newDataArray = data.data.result.map((item) => {
      let name = item.metric.pod;
      let xData = item.values.map((value) => value[0]);
      let yData = item.values.map((value) => (parseFloat(value[1]) * 100).toFixed(2));
      return {
        name: name,
        xData: xData,
        yData: yData
      };
    });
    return newDataArray;
  },
  average_cpu: (data: MonitorServiceResult) => {
    const newDataArray = data.data.result.map((item) => {
      let name = item.metric.pod;
      let xData = item.values.map((value) => value[0]);
      let yData = item.values.map((value) => parseFloat(value[1]).toFixed(2));
      return {
        name: name,
        xData: xData,
        yData: yData
      };
    });
    return newDataArray;
  },
  average_memory: (data: MonitorServiceResult) => {
    const newDataArray = data.data.result.map((item) => {
      let name = item.metric.pod;
      let xData = item.values.map((value) => value[0]);
      let yData = item.values.map((value) => parseFloat(value[1]).toFixed(2));
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

    const params = {
      type: queryKey,
      launchPadName: queryName,
      namespace: namespace,
      start: Math.floor(startTime / 1000),
      end: Math.floor(endTime / 1000),
      step: step
    };

    const result: MonitorDataResult = await monitorFetch(
      {
        url: '/query',
        params: params
      },
      kubeconfig
    ).then((res) => {
      // @ts-ignore
      return AdapterChartData[queryKey]
        ? // @ts-ignore
          AdapterChartData[queryKey](res as MonitorDataResult)
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
