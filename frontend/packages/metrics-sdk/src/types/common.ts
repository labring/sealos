export interface TimeRange {
  start?: number | string;
  end?: number | string;
  step?: string;
  time?: string;
}

export interface MetricResult {
  metric: Record<string, string>;
  values?: Array<[number, string]>;
  value?: [number, string];
}

export interface QueryResponse {
  status: string;
  data: {
    resultType: string;
    result: MetricResult[];
  };
}

export interface AuthConfig {
  kubeconfig: string;
}

export interface BaseQueryParams {
  namespace: string;
  range?: TimeRange;
}

export interface RawQueryParams extends BaseQueryParams {
  query: string;
  injectNamespace?: boolean;
}
