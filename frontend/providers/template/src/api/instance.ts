import { GET } from '@/services/request';
import { InstanceListType, TemplateInstanceType } from '@/types/app';
import { AppCrdType } from '@/types/appCRD';
import { KbPgClusterType } from '@/types/db';
import {
  adaptAppListItem,
  adaptCronJobList,
  adaptDBListItem,
  adaptInstanceListItem,
  adaptOtherList,
  sortItemsByCreateTime
} from '@/utils/adapt';
import type {
  V1CronJob,
  V1Deployment,
  V1Job,
  V1Secret,
  V1StatefulSet
} from '@kubernetes/client-node';

export const listInstance = () =>
  GET<InstanceListType>('/api/instance/list')
    .then((res) => res.items.map(adaptInstanceListItem))
    .then(sortItemsByCreateTime);

export const getInstanceByName = (instanceName: string) =>
  GET<TemplateInstanceType>('/api/instance/getByName', { instanceName }).then(
    adaptInstanceListItem
  );

export const getAppLaunchpadByName = (instanceName: string) =>
  GET<V1Deployment & V1StatefulSet[]>(`/api/app/getAppByName?instanceName=${instanceName}`).then(
    (data) => data.map(adaptAppListItem)
  );

export const getDBListByName = (instanceName: string) =>
  GET<KbPgClusterType[]>(`/api/app/getDBListByName?instanceName=${instanceName}`).then((data) =>
    data.map(adaptDBListItem)
  );

export const getCronListByName = (instanceName: string) =>
  GET<V1CronJob[]>(`/api/app/getCronListByName?instanceName=${instanceName}`).then((data) =>
    data.map(adaptCronJobList)
  );

export const listOtherByName = (instanceName: string) =>
  GET<(AppCrdType[] | V1Secret[] | V1Job[])[]>(
    `/api/app/listOtherByName?instanceName=${instanceName}`
  ).then(adaptOtherList);
