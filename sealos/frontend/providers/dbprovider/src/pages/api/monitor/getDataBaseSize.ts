import { DBTypeEnum } from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { handleAxiosStream } from '@/services/handleStream';
import { ApiResp } from '@/services/kubernet';
import { MonitorDBResult } from '@/types/monitor';
import { convertBytes } from '@/utils/tools';
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

    const queryType: { [key: string]: string } = {
      [DBTypeEnum.postgresql]: `pg_database_size_bytes{$, app_kubernetes_io_instance="${dbName}"}`,
      [DBTypeEnum.mongodb]: `mongodb_dbstats_dataSize{$, app_kubernetes_io_instance="${dbName}"}`
    };

    if (!queryType[dbType as string]) {
      return jsonRes(res, {
        code: 200,
        data: {
          message: 'no queryType'
        }
      });
    }

    const params = {
      query: queryType[dbType as string],
      namespace: namespace,
      start: startTime / 1000,
      end: endTime / 1000,
      step: '1m'
    };

    const adapterDataCharts = (data: MonitorDBResult) => {
      const temp = data?.data?.result;
      let XTimePoint: number[] = [];

      const desiredResult = temp.map((dataObject, index) => {
        if (index === 0) {
          XTimePoint = dataObject.values.map((timePoint) => timePoint[0]);
        }

        let name = '';
        switch (dbType) {
          case DBTypeEnum.mysql:
            name = dataObject.metric.app_kubernetes_io_instance + ' | ' + dataObject.metric.pod;
            break;
          case DBTypeEnum.postgresql:
            if (!dataObject.metric.datname) return null;
            name = dataObject.metric.pod + ' | ' + dataObject.metric.datname;
            break;
          case DBTypeEnum.mongodb:
            name = dataObject.metric.pod + ' | ' + dataObject.metric?.database;
            break;
          case DBTypeEnum.redis:
            break;
        }
        const data = dataObject.values.map((item) =>
          convertBytes(Number(item[1]), 'gb').toFixed(2)
        );

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
