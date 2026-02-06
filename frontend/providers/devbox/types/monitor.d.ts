export type MonitorDataResult = {
  name: string;
  xData: number[];
  yData: string[];
};

export type MonitorQueryKey = {
  cpu: string;
  memory: string;
  disk: string;
  average_memory: string;
  average_cpu: string;
};
