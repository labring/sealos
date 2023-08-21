import { DBTypeEnum } from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { handleAxiosStream } from '@/services/handleStream';
import { ApiResp } from '@/services/kubernet';
import { MonitorDBResult } from '@/types/monitor';
import { convertBytes } from '@/utils/tools';
import type { NextApiRequest, NextApiResponse } from 'next';
import { maxBy } from 'lodash';

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
      [DBTypeEnum.mysql]: `sum(mysql_global_variables_innodb_buffer_pool_size{$, app_kubernetes_io_instance="${dbName}"}) by (namespace,app_kubernetes_io_instance,pod)`
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
      namespace: namespace
      // start: startTime / 1000,
      // end: endTime / 1000,
      // step: '1m'
    };

    const adapterDataCharts = (data: MonitorDBResult) => {
      const temp = data?.data?.result;
      const maxObj = maxBy(temp, (obj) => parseFloat(obj.value[1]));
      if (!maxObj) {
        return {
          message: 'get max obj error'
        };
      }

      return {
        time: maxObj.value[0],
        value: convertBytes(Number(maxObj.value[1]), 'mb').toFixed(0),
        unit: 'MiB'
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
