import { I18nCommonKey } from './i18next';

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
        persistentvolumeclaim?: string;
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
  Disk_Used: string;
  Disk_Capacity: string;
  cpu: string;
  memory: string;
  disk: string;
};

export type AdapterData = Partial<{
  [key in keyof MonitorQueryKey]: (data: MonitorDBResult) => {
    xData: number[];
    yData: { name: string; data: number[] }[];
  };
}>;

export type ChartTemplateProps = {
  dbName: string;
  dbType: string;
  apiUrl: string;
  chartTitle: I18nCommonKey;
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

export type MonitorChartDataResult = {
  xData: number[];
  yData: {
    name: string | undefined;
    data: number[];
  }[];
};

export type AdapterChartDataType = {
  [key: string]: (data: MonitorDBResult) => MonitorChartDataResult;
};
