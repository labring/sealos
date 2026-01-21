/**
 * monitor data query API V2
 */
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import {
  monitorFetchV2,
  adaptMonitorData,
  MonitorQueryParams,
  MonitorQueryType,
  MonitorDataResult
} from '@/services/monitorFetchV2';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  // collect debug info
  const debugInfo: Record<string, any> = {};

  try {
    const kubeconfig = await authSession(req.headers);
    const { namespace } = await getK8s({
      kubeconfig: kubeconfig
    });

    const { queryName, queryKey, start, end, step = '1m', pvcName } = req.query;

    // validate parameters
    if (!queryName || !queryKey) {
      return jsonRes(res, {
        code: 400,
        error: 'Missing required parameters: queryName or queryKey'
      });
    }

    // validate queryKey is valid type
    const validTypes: MonitorQueryType[] = [
      'cpu',
      'memory',
      'average_cpu',
      'average_memory',
      'storage'
    ];
    if (!validTypes.includes(queryKey as MonitorQueryType)) {
      return jsonRes(res, {
        code: 400,
        error: `Invalid queryKey. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // calculate time range
    const endTime = end ? Number(end) : Date.now();
    const startTime = start ? Number(start) : endTime - 60 * 60 * 1000;

    // build request parameters
    const params: MonitorQueryParams = {
      type: queryKey as MonitorQueryType,
      launchPadName: queryName as string,
      namespace: namespace,
      start: Math.floor(startTime / 1000),
      end: Math.floor(endTime / 1000),
      step: step as string,
      ...(pvcName && { pvcName: pvcName as string })
    };

    debugInfo.requestParams = params;

    // call monitor service
    const response = await monitorFetchV2('/query', params, kubeconfig);

    debugInfo.rawResponse = response;

    // adapt data format
    const adaptedData = adaptMonitorData(response, queryKey as MonitorQueryType);

    debugInfo.adaptedData = adaptedData;

    const result: MonitorDataResult[] = adaptedData;

    debugInfo.finalResult = result;

    jsonRes(res, {
      code: 200,
      data: {
        result,
        debug: debugInfo
      }
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error: error
    });
  }
}
