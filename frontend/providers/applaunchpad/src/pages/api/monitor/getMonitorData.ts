import { authSession, getLocalAdminKubeConfig } from '@/services/backend/auth';
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
      let yData = item.values.map((value) => (parseFloat(value[1]) * 100).toFixed(2));
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
      let yData = item.values.map((value) => (parseFloat(value[1]) * 100).toFixed(2));
      return {
        name: name,
        xData: xData,
        yData: yData
      };
    });
    return newDataArray;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const reqNamespace = req.query.namespace as string;
    const kubeconfig = await authSession(req.headers);
    const { namespace, kc } = await getK8s({
      kubeconfig: kubeconfig
    });

    const { queryName, queryKey, start, end, step = '1m' } = req.query;

    // One hour of monitoring data
    const endTime = Date.now();
    const startTime = endTime - 60 * 60 * 1000;

    const params = {
      type: queryKey,
      launchPadName: queryName,
      namespace: reqNamespace,
      start: startTime / 1000,
      end: endTime / 1000,
      step: step
    };

    const adminkc = getLocalAdminKubeConfig();
    console.log('kubeconfig');
    console.log(adminkc);

    const result: MonitorDataResult = await monitorFetch(
      {
        url: '/query',
        params: params
      },
      // yaml.dump(JSON.parse(kubeconfig))
      adminkc
    ).then((res) => {
      // console.log(res.data.result, res.data.result[0].values.length, 'AdapterChartData');
      // @ts-ignore
      return AdapterChartData[queryKey]
        ? // @ts-ignore
          AdapterChartData[queryKey](res as MonitorDataResult)
        : res;
    });

    jsonRes(res, {
      code: 200,
      data: result
    });
  } catch (error) {
    console.log(error, 'monitor error');
    jsonRes(res, {
      code: 200,
      message: 'fetch monitor err: ' + error
    });
  }
}
