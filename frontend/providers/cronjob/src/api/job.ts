import { DELETE, GET, POST } from '@/services/request';
import { adaptCronJobDetail, adaptCronJobList, adaptEvents, adaptJobItemList } from '@/utils/adapt';

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

export const getJobListAndEvents = (name: string) =>
  getJobList(name).then(async (res) => {
    const promises = res.history.map(async (item) => {
      const events = await getJobEvents(item.name!);
      item.events = events;
      return item;
    });
    const jobsWithEvents = await Promise.all(promises);
    return {
      total: res.total,
      successAmount: res.successAmount,
      history: jobsWithEvents
    };
  });
