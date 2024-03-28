import { Authority, QuotaData, TBucket, UserSecretData } from '@/consts';
import request from '@/services/request';
import { AxiosInstance } from 'axios';
import { ApiResp } from '@/services/backend/response';

export const _createBucket =
  (request: AxiosInstance) => (data: { bucketName: string; bucketPolicy: Authority }) =>
    request.post<any>('/api/bucket/create', data);
export const createBucket = _createBucket(request);
export const _listBucket = (request: AxiosInstance) => () =>
  request.post<any, { list: TBucket[] }>(`/api/bucket/list`);
export const listBucket = _listBucket(request);
export const _getQuota = (request: AxiosInstance) => () =>
  request.post<any, { quota: QuotaData }>('/api/quota');
export const getQuota = _getQuota(request);
export const _infoBucket = (request: AxiosInstance) => (data: { bucketName: string }) =>
  request.post<any>('/api/bucket/info', data);
export const infoBucket = _infoBucket(request);
export const _deleteBucket = (request: AxiosInstance) => (data: { bucketName: string }) =>
  request.post<any>('/api/bucket/delete', data);
export const deleteBucket = _deleteBucket(request);
export const _initUser = (request: AxiosInstance) => () =>
  request.get<
    any,
    {
      secret: UserSecretData;
    }
  >('/api/user/init');
export const initUser = _initUser(request);

export const _getHostStatus = (request: AxiosInstance) => (data: { bucket: string }) =>
  request.post<any, any[]>('/api/site/status', data);
export const getHostStatus = _getHostStatus(request);

export const _openHost = (request: AxiosInstance) => (data: { bucket: string }) =>
  request.post<any>('/api/site/openHost', data);
export const openHost = _openHost(request);

export const _closeHost = (request: AxiosInstance) => (data: { bucket: string }) =>
  request.post<any>('/api/site/closeHost', data);
export const closeHost = _closeHost(request);
