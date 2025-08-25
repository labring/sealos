import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { handleAxiosStream } from '@/services/handleStream';
import { ApiResp } from '@/services/kubernet';
import { MonitorDBResult } from '@/types/monitor';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const kubeconfig = await authSession(req);
    const { namespace, kc } = await getK8s({
      kubeconfig: kubeconfig
    });

    const { dbName, dbType } = req.query;
    const endTime = Date.now(); // 当前时间的时间戳
    const startTime = endTime - 60 * 60 * 1000; // 前向推进1个小时的时间戳

    const _query = `rate(container_cpu_usage_seconds_total{$,pod=~"${dbName}-${
      dbType === 'apecloud-mysql' ? 'mysql' : dbType
    }-\\\\d+",name=""}[1m]) *100`;

    const params = {
      query: _query,
      namespace: namespace,
      start: startTime / 1000,
      end: endTime / 1000,
      step: '1m'
    };

    const adapterDataCharts = (data: MonitorDBResult) => {
      const temp = data?.data?.result;
      let XTimePoint: number[] = [];

      const desiredResult = temp.map((dataObject, index) => {
        const name = dataObject.metric.pod;
        if (index === 0) {
          XTimePoint = dataObject.values.map((timePoint) => timePoint[0]);
        }

        const data = dataObject.values.map((item) => parseFloat(item[1]).toFixed(2));

        return { name, data };
      });

      return {
        xData: XTimePoint,
        yData: desiredResult
      };
    };

    const result = await handleAxiosStream(
      {
        url: '/query',
        params: params
      },
      kubeconfig
    ).then((res) => adapterDataCharts(res as MonitorDBResult));

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
