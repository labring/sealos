import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { monitorFetch } from '@/services/monitorFetch';
import { MonitorServiceResult, MonitorDataResult, MonitorQueryKey } from '@/types/monitor';
import type { NextApiRequest, NextApiResponse } from 'next';

const AdapterChartData: Record<
  keyof MonitorQueryKey,
  (data: MonitorServiceResult) => MonitorDataResult[]
> = {
  disk: (data: MonitorServiceResult) => {
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
  cpu: (data: MonitorServiceResult) => {
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
  memory: (data: MonitorServiceResult) => {
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
  },
  storage: (data: MonitorServiceResult) => {
    const newDataArray = data.data.result.map((item) => {
      let name = item.metric.persistentvolumeclaim;
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
    const { namespace, kc } = await getK8s({
      kubeconfig: kubeconfig
    });

    const { queryName, queryKey, start, end, step = '1m', pvcName } = req.query;

    // One hour of monitoring data
    const endTime = end ? Number(end) : Date.now();
    const startTime = start ? Number(start) : endTime - 60 * 60 * 1000;

    const params = {
      type: queryKey,
      launchPadName: queryName,
      namespace: namespace,
      start: Math.floor(startTime / 1000),
      end: Math.floor(endTime / 1000),
      step: step,
      ...(pvcName && { pvcName: pvcName })
    };

    const result: MonitorDataResult[] = await monitorFetch(
      {
        url: '/query',
        params: params
      },
      kubeconfig
    ).then((res) => {
      const key = queryKey as keyof MonitorQueryKey;
      const adaptedData = AdapterChartData[key]
        ? AdapterChartData[key](res as MonitorServiceResult)
        : (res as any);

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
