/**
 * Network Monitor Data Query API
 * Used to query network request count and percent
 */
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import {
  networkMonitorFetch,
  NetworkMonitorQueryParams,
  NetworkMonitorQueryType,
  NetworkMonitorDataResult,
  NetworkMonitorServiceResponse,
  buildFullServiceName
} from '@/services/networkMonitorFetch';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * adapt network monitor data to chart data format
 */
const adaptNetworkMonitorData = (
  response: NetworkMonitorServiceResponse,
  type: NetworkMonitorQueryType
): NetworkMonitorDataResult[] => {
  if (response.status !== 'success' || !response.data?.result) {
    return [];
  }

  // define status code order
  const statusCodeOrder = ['2xx', '3xx', '4xx', '5xx'];

  // use Map to deduplicate same response_code_class
  const uniqueResultsMap = new Map<string, NetworkMonitorDataResult>();

  response.data.result.forEach((item) => {
    const name = item.metric.response_code_class || 'unknown';

    // if the response_code_class already exists, skip
    if (uniqueResultsMap.has(name)) {
      return;
    }

    // handle range query (matrix) and instant query (vector)
    if (response.data.resultType === 'matrix' && item.values) {
      uniqueResultsMap.set(name, {
        name: name,
        xData: item.values.map((v) => v[0]),
        yData: item.values.map((v) => {
          const value = parseFloat(v[1]);
          // for percent, keep 2 decimal places; for count, keep integer
          return type === 'network_service_request_percent'
            ? value.toFixed(2)
            : Math.round(value).toString();
        })
      });
    } else if (item.value) {
      const value = parseFloat(item.value[1]);
      uniqueResultsMap.set(name, {
        name: name,
        xData: [item.value[0]],
        yData: [
          type === 'network_service_request_percent'
            ? value.toFixed(2)
            : Math.round(value).toString()
        ]
      });
    } else {
      uniqueResultsMap.set(name, {
        name: name,
        xData: [],
        yData: []
      });
    }
  });

  // base time axis: use xData of existing data first
  const baseXData =
    Array.from(uniqueResultsMap.values()).find((item) => item.xData.length > 0)?.xData || [];

  // fill empty data for existing groups by base time axis
  if (baseXData.length > 0) {
    const zeroValue = type === 'network_service_request_percent' ? '0.00' : '0';
    uniqueResultsMap.forEach((item, key) => {
      if (
        item.xData.length === baseXData.length &&
        item.xData.every((x, i) => x === baseXData[i])
      ) {
        return;
      }
      const valueMap = new Map<number, string>();
      item.xData.forEach((x, i) => {
        const y = item.yData[i];
        if (typeof y === 'string') {
          valueMap.set(x, y);
        }
      });
      uniqueResultsMap.set(key, {
        ...item,
        xData: baseXData,
        yData: baseXData.map((x) => valueMap.get(x) ?? zeroValue)
      });
    });
  }

  // ensure 2xx/3xx/4xx/5xx have data, fill with 0 if missing
  statusCodeOrder.forEach((statusCode) => {
    if (uniqueResultsMap.has(statusCode)) {
      return;
    }
    const zeroValue = type === 'network_service_request_percent' ? '0.00' : '0';
    uniqueResultsMap.set(statusCode, {
      name: statusCode,
      xData: baseXData,
      yData: baseXData.map(() => zeroValue)
    });
  });

  // convert to array and sort by status code order
  const results = Array.from(uniqueResultsMap.values());
  return results.sort((a, b) => {
    const indexA = statusCodeOrder.indexOf(a.name || '');
    const indexB = statusCodeOrder.indexOf(b.name || '');
    return indexA - indexB;
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const debugInfo: Record<string, any> = {};

  try {
    const kubeconfig = await authSession(req.headers);
    const { namespace } = await getK8s({
      kubeconfig: kubeconfig
    });

    const { serviceName, port, type, start, end, step = '2m' } = req.query;

    // Validate required parameters
    if (!serviceName || !port || !type) {
      return jsonRes(res, {
        code: 400,
        error: 'Missing required parameters: serviceName, port, or type'
      });
    }

    // Validate type value
    const validTypes: NetworkMonitorQueryType[] = [
      'network_service_request_count',
      'network_service_request_percent'
    ];
    if (!validTypes.includes(type as NetworkMonitorQueryType)) {
      return jsonRes(res, {
        code: 400,
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Calculate time range
    const endTime = end ? Number(end) : Date.now();
    const startTime = start ? Number(start) : endTime - 60 * 60 * 1000;

    // Build full service name
    const fullServiceName = buildFullServiceName(serviceName as string, namespace);

    // Build request params
    const params: NetworkMonitorQueryParams = {
      type: type as NetworkMonitorQueryType,
      service: fullServiceName,
      port: Number(port),
      namespace: namespace,
      start: Math.floor(startTime / 1000),
      end: Math.floor(endTime / 1000),
      step: step as string
    };

    debugInfo.requestParams = params;

    // Call network monitor service
    const response = await networkMonitorFetch('/query', params, kubeconfig);

    debugInfo.rawResponse = response;

    // Adapt response data format
    const adaptedData = adaptNetworkMonitorData(response, type as NetworkMonitorQueryType);

    debugInfo.adaptedData = adaptedData;

    const result: NetworkMonitorDataResult[] = adaptedData;

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
