import { DBTypeEnum } from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { handleAxiosStream } from '@/services/handleStream';
import { ApiResp } from '@/services/kubernet';
import { MonitorDBResult } from '@/types/monitor';
import { convertBytes } from '@/utils/tools';
import type { NextApiRequest, NextApiResponse } from 'next';
import { MonitorQueryKey } from '@/types/monitor';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const kubeconfig = await authSession(req);
    const { namespace, kc } = await getK8s({
      kubeconfig: kubeconfig
    });
    const { dbName, dbType, queryKey } = req.query;
    const endTime = Date.now(); // 当前时间的时间戳
    const startTime = endTime - 60 * 60 * 1000; // 前向推进1个小时的时间戳

    const queryType: Partial<MonitorQueryKey> = {
      Mongodb_DocumentOperations: `rate(mongodb_mongod_metrics_document_total{$, app_kubernetes_io_instance="${dbName}"}[1m])`,
      Mongodb_QueryOperations: `rate(mongodb_op_counters_total{$, app_kubernetes_io_instance="${dbName}"}[5m]) or irate(mongodb_op_counters_total{$, app_kubernetes_io_instance="${dbName}"}[5m])`,
      Mongodb_PageFaults: `rate(mongodb_extra_info_page_faults_total{$, app_kubernetes_io_instance="${dbName}"}[5m]) or irate(mongodb_extra_info_page_faults_total{$, app_kubernetes_io_instance="${dbName}"}[5m])`
    };

    console.log(dbName, dbType, queryKey, queryType[queryKey as keyof MonitorQueryKey]);

    if (!queryType[queryKey as keyof MonitorQueryKey]) {
      return jsonRes(res, {
        code: 200,
        data: {
          message: 'no queryType'
        }
      });
    }

    const params = {
      query: queryType[queryKey as keyof MonitorQueryKey],
      namespace: namespace,
      start: startTime / 1000,
      end: endTime / 1000,
      step: '1m'
    };

    const adapterDataCharts = (data: MonitorDBResult) => {
      const temp = data?.data?.result;

      let XTimePoint: number[] = [];

      const desiredResult = temp.map((dataObject, index) => {
        // x time
        if (index === 0) {
          XTimePoint = dataObject.values.map((timePoint) => timePoint[0]);
        }

        let name = '';
        switch (queryKey as keyof MonitorQueryKey) {
          case 'Mongodb_DocumentOperations':
            name = dataObject.metric.pod + ' - ' + dataObject.metric?.state;
            break;
          case 'Mongodb_QueryOperations':
            name = dataObject.metric.pod + ' - ' + dataObject.metric?.type;
            break;
          case 'Mongodb_PageFaults':
            name = dataObject.metric.pod;
            break;
        }

        // y value
        const data = dataObject.values.map((item) => parseFloat(item[1]).toFixed(3));

        return { name, data };
      });

      return {
        xData: XTimePoint,
        yData: desiredResult.filter((item) => item !== null)
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
      data: { result }
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error: error
    });
  }
}
