import { BoxProps } from '@chakra-ui/react';

export interface MonitorServiceResult {
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
  cpu: string;
  memory: string;
  disk: string;
  average_memory: string;
  average_cpu: string;
};

export type MonitorDataResult = {
  name: string;
  xData: number[];
  yData: string[];
};
