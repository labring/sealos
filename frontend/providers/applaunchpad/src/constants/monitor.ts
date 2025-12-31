import { MonitorDataResult } from '@/types/monitor';

export const EMPTY_MONITOR_DATA: MonitorDataResult = {
  name: '',
  xData: new Array(30).fill(0),
  yData: new Array(30).fill('0')
};
