import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { handleAxiosStream } from '@/services/handleStream';
import { ApiResp } from '@/services/kubernet';
import { AdapterChartDataType, MonitorChartDataResult, MonitorDBResult } from '@/types/monitor';
import type { NextApiRequest, NextApiResponse } from 'next';

const AdapterChartData: AdapterChartDataType = {
  disk: (data: MonitorDBResult) => {
    const temp = data?.data?.result;
    let XTimePoint: number[] = [];
    const desiredResult = temp.map((dataObject, index) => {
      const name = dataObject.metric?.persistentvolumeclaim;
      if (index === 0) {
        XTimePoint = dataObject.values.map((timePoint) => timePoint[0]);
      }
      const data = dataObject.values.map((item) => parseFloat(item[1]));
      return { name, data };
    });
    return {
      xData: XTimePoint,
      yData: desiredResult
    };
  },
  cpu: (data: MonitorDBResult) => {
    const temp = data?.data?.result;
    let XTimePoint: number[] = [];
    const desiredResult = temp.map((dataObject, index) => {
      const name = dataObject.metric?.pod;
      if (index === 0) {
        XTimePoint = dataObject.values.map((timePoint) => timePoint[0]);
      }
      const data = dataObject.values.map((item) => parseFloat(item[1]));
      return { name, data };
    });
    return {
      xData: XTimePoint,
      yData: desiredResult
    };
  },
  memory: (data: MonitorDBResult) => {
    const temp = data?.data?.result;
    let XTimePoint: number[] = [];
    const desiredResult = temp.map((dataObject, index) => {
      const name = dataObject.metric?.pod;
      if (index === 0) {
        XTimePoint = dataObject.values.map((timePoint) => timePoint[0]);
      }
      const data = dataObject.values.map((item) => parseFloat(item[1]));
      return { name, data };
    });
    return {
      xData: XTimePoint,
      yData: desiredResult
    };
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const kubeconfig = await authSession(req);
    const { namespace, kc } = await getK8s({
      kubeconfig: kubeconfig
    });

    const { dbName, dbType, queryKey, start, end, step } = req.query;
    const endTime = Date.now(); // 当前时间的时间戳
    const startTime = endTime - 60 * 60 * 1000; // 前向推进1个小时的时间戳

    const params = {
      query: queryKey,
      app: dbName,
      type: dbType,
      namespace: namespace,
      start: start ? Number(start) : startTime / 1000,
      end: end ? Number(end) : endTime / 1000,
      step: '1m'
    };

    const result: MonitorChartDataResult = await handleAxiosStream(
      {
        url: '/q',
        params: params
      },
      kubeconfig
    ).then((res) => {
      // @ts-ignore
      return AdapterChartData[queryKey] ? AdapterChartData[queryKey](res as MonitorDBResult) : res;
    });

    jsonRes(res, {
      code: 200,
      data: {
        result
      }
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error: error
    });
  }
}
