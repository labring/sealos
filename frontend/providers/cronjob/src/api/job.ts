import { DELETE, GET, POST } from '@/services/request';
import {
  adaptCronJobDetail,
  adaptCronJobList,
  adaptEvents,
  adaptJobDetail,
  adaptJobItemList
} from '@/utils/adapt';
import { V1PodList } from '@kubernetes/client-node';

export const applyYamlList = (yamlList: string[], type: 'create' | 'replace' | 'update') =>
  POST('/api/applyYamlList', { yamlList, type });

export const getCronJobList = () =>
  GET('/api/cronjob/getCronJobList').then((data) => data.map(adaptCronJobList));

export const getCronJobByName = (name: string) =>
  GET(`/api/cronjob/getByName?name=${name}`).then(adaptCronJobDetail);

export const delCronJobByName = (name: string) => DELETE('/api/cronjob/delByName', { name });

export const updateCronJobStatus = ({
  jobName,
  type
}: {
  jobName: string;
  type: 'Stop' | 'Start';
}) => POST('/api/cronjob/startAndStop', { jobName, type });

export const getJobList = (name: string) =>
  GET(`/api/job/list?cronJobName=${name}`).then(adaptJobItemList);

export const getJobEvents = (name: string) => GET(`/api/job/event?name=${name}`).then(adaptEvents);

export const getPodLogs = (podName: string) => GET<string>(`/api/getPodLogs?podName=${podName}`);

export const getJobPodList = (jobNames: string[]) =>
  POST<V1PodList>(`/api/getJobPodList`, { jobNames });

export const getJobListEventsAndLogs = (cronJobName: string) =>
  getJobList(cronJobName).then(adaptJobDetail);
