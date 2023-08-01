export interface MonitorDBResult {
  status: string;
  data: {
    resultType: string;
    result: {
      metric: {
        app_kubernetes_io_instance: string;
        app_kubernetes_io_managed_by: string;
        app_kubernetes_io_name: string;
        apps_kubeblocks_io_component_name: string;
        datname: string;
        instance: string;
        job: string;
        namespace: string;
        node: string;
        pod: string;
        server: string;
        service: string;
        __name__: string;
        state?: string;
        command?: string;
        database?: string;
        db: string;
        type?: string;
        cmd?: string;
      };
      value: [number, string];
      values: [[number, string]];
    }[];
  };
}

export type MonitorQueryKey = {
  Mongodb_DocumentOperations: string;
  Mongodb_QueryOperations: string;
  Mongodb_PageFaults: string;
  Redis_CommandLatency: string;
  Redis_KeyEvictions: string;
  Redis_HitsRatio: string;
};

export type ChartTemplateProps = {
  dbName: string;
  dbType: string;
  apiUrl: string;
  chartTitle: string;
  isShowLegend?: boolean;
  db?: DBDetailType;
  queryKey?: keyof MonitorQueryKey;
  yAxisLabelFormatter?: (value: number) => string;
  unit?: string;
};

export type MonitorChartList = ChartTemplateProps & {
  monitorType: string;
  isShowDB?: string[];
};
