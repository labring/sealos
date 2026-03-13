/**
 * VictoriaMetrics Service monitor data query service V2
 */

export type MonitorQueryType = 'cpu' | 'memory' | 'average_cpu' | 'average_memory' | 'storage';

export interface MonitorQueryParams {
  namespace: string;
  type: MonitorQueryType;
  launchPadName: string;
  start?: number;
  end?: number;
  step?: string;
  time?: number;
  pvcName?: string;
}

export interface MonitorMetric {
  pod?: string;
  persistentvolumeclaim?: string;
  namespace?: string;
  [key: string]: string | undefined;
}

export interface MonitorResultItem {
  metric: MonitorMetric;
  value?: [number, string];
  values?: [number, string][];
}

export interface MonitorServiceResponse {
  status: string;
  isPartial: boolean;
  data: {
    resultType: 'vector' | 'matrix';
    result: MonitorResultItem[];
  };
  stats: {
    execTime: number;
  };
}

export interface MonitorDataResult {
  name?: string;
  xData: number[];
  yData: Array<string | null>;
}

/**
 * monitor data query method V2
 * use POST request and application/x-www-form-urlencoded format
 */
export const monitorFetchV2 = async (
  url: string,
  params: MonitorQueryParams,
  kubeconfig: string
): Promise<MonitorServiceResponse> => {
  const domain =
    global.AppConfig.launchpad.components.monitor.url ||
    'http://launchpad-monitor.sealos.svc.cluster.local:8428';

  // 构建 form-urlencoded body
  const formBody = new URLSearchParams();
  formBody.append('namespace', params.namespace);
  formBody.append('type', params.type);
  formBody.append('launchPadName', params.launchPadName);

  if (params.start !== undefined) {
    formBody.append('start', String(params.start));
  }
  if (params.end !== undefined) {
    formBody.append('end', String(params.end));
  }
  if (params.step) {
    formBody.append('step', params.step);
  }
  if (params.time !== undefined) {
    formBody.append('time', String(params.time));
  }
  if (params.pvcName) {
    formBody.append('pvcName', params.pvcName);
  }

  const requestOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: encodeURIComponent(kubeconfig)
    },
    body: formBody.toString()
  };

  try {
    const response = await fetch(`${domain}${url}`, requestOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Error monitorFetchV2: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const jsonData = await response.json();
    return jsonData;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      throw new Error('Please check if monitor service api is configured');
    }
    throw error;
  }
};
