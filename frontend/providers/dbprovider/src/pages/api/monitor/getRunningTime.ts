import { DBTypeEnum } from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { handleAxiosStream } from '@/services/handleStream';
import { ApiResp } from '@/services/kubernet';
import { MonitorDBResult } from '@/types/monitor';
import { max, maxBy } from 'lodash';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const kubeconfig = await authSession(req);
    const { namespace, kc } = await getK8s({
      kubeconfig: kubeconfig
    });
    const { dbName, dbType } = req.query;

    const queryType: { [key: string]: string } = {
      [DBTypeEnum.postgresql]: `avg by(namespace, app_kubernetes_io_instance, pod) (time() - pg_postmaster_start_time_seconds{$, app_kubernetes_io_instance="${dbName}"})`,
      [DBTypeEnum.mysql]: `sum(mysql_global_status_uptime{$, app_kubernetes_io_instance="${dbName}"}) by (namespace,app_kubernetes_io_instance,pod)`,
      [DBTypeEnum.mongodb]: `sum by(namespace, app_kubernetes_io_instance, pod) (mongodb_instance_uptime_seconds{$, app_kubernetes_io_instance="${dbName}"})`,
      [DBTypeEnum.redis]: `redis_uptime_in_seconds{$, app_kubernetes_io_instance="${dbName}"}`
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
    };

    const adapterData = (res: MonitorDBResult) => {
      const temp = res.data.result;

      const maxObj = maxBy(temp, (obj) => parseFloat(obj.value[1]));
      if (!maxObj)
        return {
          message: 'get time error'
        };
      const time = new Date(maxObj.value[0] * 1000).toLocaleString();
      // The data returned by the system is in seconds
      const maxTime = maxObj.value[1];

      return {
        currentTime: time,
        maxRunningTime: maxTime
      };
    };

    const result = await handleAxiosStream(
      {
        url: '/query',
        params: params
      },
      kubeconfig
    ).then((res) => adapterData(res as MonitorDBResult));

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
