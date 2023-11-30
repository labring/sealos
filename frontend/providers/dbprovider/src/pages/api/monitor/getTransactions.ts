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
      postgresql: `rate(pg_stat_database_xact_commit_total{$, app_kubernetes_io_instance="${dbName}"}[1m])`,
      'apecloud-mysql': `topk(5, rate(mysql_global_status_commands_total{$, app_kubernetes_io_instance="${dbName}"}[1m])>0)`
    };

    console.log(dbName, dbType, queryType[dbType as string]);
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
        // x time
        if (index === 0) {
          XTimePoint = dataObject.values.map((timePoint) => timePoint[0]);
        }

        let name = '';
        switch (dbType) {
          case DBTypeEnum.mysql:
            name = dataObject.metric?.command + ' | ' + dataObject.metric.pod;
            break;
          case DBTypeEnum.postgresql:
            if (!dataObject.metric.datname) return null;
            name = dataObject.metric.pod + ' | ' + dataObject.metric.datname;
            break;
          case DBTypeEnum.mongodb:
            name = dataObject.metric.pod + ' | ' + dataObject.metric?.state;
            break;
          case DBTypeEnum.redis:
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
