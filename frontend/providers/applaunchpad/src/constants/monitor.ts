import { MonitorDataResult } from '@/types/monitor';

export const LineStyleMap = [
  {
    backgroundColor: 'rgba(73, 174, 255, 0.3)',
    lineColor: '#49AEFF'
  },
  {
    backgroundColor: 'rgba(0, 209, 181, 0.3)',
    lineColor: '#00D1B5'
  },
  {
    backgroundColor: 'rgba(139, 139, 255, 0.3)',
    lineColor: '#8B8BFF'
  },
  {
    backgroundColor: 'rgba(81, 125, 255, 0.3)',
    lineColor: '#517DFF'
  },
  {
    backgroundColor: 'rgba(189, 139, 255, 0.3)',
    lineColor: '#BD8BFF'
  },
  {
    backgroundColor: 'rgba(228, 139, 255, 0.3)',
    lineColor: '#E48BFF'
  },
  {
    backgroundColor: 'rgba(26, 200, 244, 0.3)',
    lineColor: '#1AC8F4'
  },
  {
    backgroundColor: 'rgba(255, 139, 226, 0.3)',
    lineColor: '#FF8BE2'
  },
  {
    backgroundColor: 'rgba(147, 221, 0, 0.3)',
    lineColor: '#93DD00'
  },
  {
    backgroundColor: 'rgba(255, 139, 141, 0.3)',
    lineColor: '#FF8B8D'
  },
  {
    backgroundColor: 'rgba(255, 176, 139, 0.3)',
    lineColor: '#FFB08B'
  },
  {
    backgroundColor: 'rgba(239, 211, 0, 0.3)',
    lineColor: '#EFD300'
  }
];

export const EMPTY_MONITOR_DATA: MonitorDataResult = {
  name: '',
  xData: new Array(30).fill(0),
  yData: new Array(30).fill('0')
};

export const REFRESH_INTERVAL_OPTIONS = [
  { value: 1000, label: '1s' },
  { value: 2000, label: '2s' },
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
  { value: 0, label: 'close' }
];
