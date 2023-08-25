import { DELETE, GET, POST } from '@/services/request';
import { adaptJobDetail, adaptJobList } from '@/utils/adapt';

export const applyYamlList = (yamlList: string[], type: 'create' | 'replace' | 'update') =>
  POST('/api/applyYamlList', { yamlList, type });

export const getMyJobList = () =>
  GET('/api/cronjob/getJobList').then((data) => data.map(adaptJobList));

export const getJobByName = (name: string) =>
  GET(`/api/cronjob/getByName?name=${name}`).then(adaptJobDetail);

export const delJobByName = (name: string) => DELETE('/api/cronjob/delByName', { name });

export const updateCronJobStatus = ({
  jobName,
  type
}: {
  jobName: string;
  type: 'Stop' | 'Start';
}) => POST('/api/cronjob/startAndStop', { jobName, type });
