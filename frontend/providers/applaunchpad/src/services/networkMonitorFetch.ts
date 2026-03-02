/**
 * Network Monitor Service - network request count monitor
 */

export type NetworkMonitorQueryType =
  | 'network_service_request_count'
  | 'network_service_request_percent';

export interface NetworkMonitorQueryParams {
  namespace: string;
  type: NetworkMonitorQueryType;
  service: string; // full service name, like serviceName.namespace.svc.cluster.local
  port: number; // port number
  start?: number;
  end?: number;
  step?: string;
  time?: number;
}

export interface NetworkMonitorMetric {
  response_code_class?: string; // status code class: 2xx, 3xx, 4xx, 5xx
  cluster_name?: string;
  container?: string;
  endpoint?: string;
  instance?: string;
  job?: string;
  namespace?: string;
  node?: string;
  pod?: string;
  prometheus?: string;
  __name__?: string;
  [key: string]: string | undefined;
}

export interface NetworkMonitorResultItem {
  metric: NetworkMonitorMetric;
  value?: [number, string];
  values?: [number, string][];
}

export interface NetworkMonitorServiceResponse {
  status: string;
  isPartial: boolean;
  data: {
    resultType: 'vector' | 'matrix';
    result: NetworkMonitorResultItem[];
  };
  stats?: {
    execTime: number;
  };
}

export interface NetworkMonitorDataResult {
  name?: string; // status code class name: 2xx, 3xx, 4xx, 5xx
  xData: number[];
  yData: Array<string | null>;
}

/**
 * build full service name
 */
export const buildFullServiceName = (serviceName: string, namespace: string): string => {
  return `${serviceName}.${namespace}.svc.cluster.local`;
};

/**
 * network monitor data query method
 */
export const networkMonitorFetch = async (
  url: string,
  params: NetworkMonitorQueryParams,
  kubeconfig: string
): Promise<NetworkMonitorServiceResponse> => {
  const domain =
    global.AppConfig.launchpad.components.monitor.url ||
    'http://launchpad-monitor.sealos.svc.cluster.local:8428';

  // build URL query parameters
  const queryParams = new URLSearchParams();
  queryParams.append('namespace', params.namespace);
  queryParams.append('type', params.type);
  queryParams.append('service', params.service);
  queryParams.append('port', String(params.port));

  if (params.start !== undefined) {
    queryParams.append('start', String(params.start));
  }
  if (params.end !== undefined) {
    queryParams.append('end', String(params.end));
  }
  if (params.step) {
    queryParams.append('step', params.step);
  }
  if (params.time !== undefined) {
    queryParams.append('time', String(params.time));
  }

  const requestUrl = `${domain}${url}?${queryParams.toString()}`;

  const requestOptions: RequestInit = {
    method: 'GET',
    headers: {
      Authorization: encodeURIComponent(kubeconfig)
    }
  };

  try {
    const response = await fetch(requestUrl, requestOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Error networkMonitorFetch: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const jsonData = await response.json();
    return jsonData;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      throw new Error('Please check if network monitor service api is configured' + error);
    }
    throw error;
  }
};
