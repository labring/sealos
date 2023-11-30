import { MonitorData } from '@/consts';
import request from '@/services/request';
import { AxiosInstance } from 'axios';

/**
 * @ bucket : bucketName(ns-bucketCRName)
 */
export const _monitor = (request: AxiosInstance) => (data: { bucket: string }) =>
  request.post<any, MonitorData['result'][]>('/api/monitor', data);
export const monitor = _monitor(request);
