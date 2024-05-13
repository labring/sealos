import { ServerTypePayload } from '@/pages/api/cloudserver/listType';
import { UpdateStatusPayload } from '@/pages/api/cloudserver/updateStatus';
import { POST } from '@/services/request';
import adaptCloudServerListItem from '@/types/adapt';
import { CloudServerPrice, CloudServerType, EditForm, OperatingSystems } from '@/types/cloudserver';
import { CVMInstanceType } from '@/types/cloudserver';
import { CVMRegionType } from '@/types/region';

export const getCloudServerRegion = () => POST<CVMRegionType[]>('/api/cloudserver/getRegion');

export const getCloudServerType = (payload: ServerTypePayload) =>
  POST<CloudServerType[]>('/api/cloudserver/listType', payload);

export const getCloudServerImage = () => POST<OperatingSystems>('/api/cloudserver/listImage');

export const createCloudServer = (payload: EditForm) => POST('/api/cloudserver/create', payload);

export const delCloudServer = () => POST('/api/cloudserver/delete');

export const updateCloudServerStatus = (payload: UpdateStatusPayload) =>
  POST('/api/cloudserver/updateStatus', payload);

export const listCloudServer = (payload: { page: number; pageSize: number }) =>
  POST<{ list: CVMInstanceType[]; page: number; pageSize: number; total: number }>(
    '/api/cloudserver/list',
    payload
  ).then((data) => {
    return {
      ...data,
      list: data?.list?.map(adaptCloudServerListItem)
    };
  });

export const getCloudServerPrice = (payload: EditForm) =>
  POST<CloudServerPrice>('/api/cloudserver/price', payload);
